// services/preferenceTracking.ts
'use client';

/**
 * Track user preferences for Lytics
 * Syncs user preferences from Supabase to Lytics for audience matching
 */

import lyticsService from './lytics';
import { createClient } from '@/utils/supabase/client';

export interface UserPreferences {
  goal: string | null;
  role: string | null;
  education: string | null;
  topics: string[] | null;
  schedule: string | null;
  daily_goal_minutes: number | null;
}

/**
 * Sync user preferences to Lytics
 * Called after login or when preferences are updated
 */
export async function syncPreferencesToLytics(
  userData: {
    email: string;
    user_id: string;
    full_name?: string;
  },
  preferences: UserPreferences,
  total_completed_courses?: number
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Wait for Lytics to be ready
  const checkAndSync = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag) {
      // Lytics not loaded yet, retry after a short delay
      setTimeout(checkAndSync, 100);
      return;
    }

    // Check if jstag has identify method
    if (typeof jstag.identify !== 'function' && typeof jstag.send !== 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ jstag.identify and jstag.send are not available');
      }
      return;
    }

    try {
      // DEBUG: Log what we're about to send
      console.log('[PreferenceTracking] 🔍 [DEBUG] Syncing preferences to Lytics:', {
        email: userData.email,
        user_id: userData.user_id,
        preferences: {
          goal: preferences.goal,
          role: preferences.role,
          education: preferences.education,
          topics: preferences.topics,
          topics_count: preferences.topics?.length || 0,
          schedule: preferences.schedule,
          daily_goal_minutes: preferences.daily_goal_minutes,
          daily_goal_minutes_type: typeof preferences.daily_goal_minutes,
        },
      });

      // Use lyticsService to identify user with preferences
      // Wait for audience processing to complete so segments are available
      lyticsService.identifyUser({
        email: userData.email,
        id: userData.user_id,
        name: userData.full_name,
        createdAt: new Date().toISOString(),
      }, {
        waitForAudienceProcessing: true,
        preferences: {
          goal: preferences.goal,
          role: preferences.role,
          education: preferences.education,
          topics: preferences.topics,
          schedule: preferences.schedule,
          daily_goal_minutes: preferences.daily_goal_minutes,
        },
        total_completed_courses,
        onSegmentsReady: async (segments) => {
          console.log('[PreferenceTracking] ✅ Audience processing complete after identify:');
          console.log('[PreferenceTracking] 📋 User segments:', JSON.stringify(segments, null, 2));
          
          // Check cs-lytics-audiences cookie and fetch variant if audience matches
          // Fallback to database if cookie is not present or doesn't match
          try {
            const { fetchVariantFromAudiences } = await import('./personalize');
            const supabase = createClient();
            console.log('[PreferenceTracking] 🔄 Fetching variant (with database fallback)');
            console.log('[PreferenceTracking] 🔄 User ID:', userData.user_id);
            console.log('[PreferenceTracking] 🔄 Supabase client:', !!supabase);
            const result = await fetchVariantFromAudiences(userData.user_id, supabase);
            console.log('[PreferenceTracking] 🔄 Variant fetch result:', result);
          } catch (error) {
            console.error('[PreferenceTracking] ❌ Failed to fetch variant from audiences:', error);
            console.error('[PreferenceTracking] ❌ Error details:', error instanceof Error ? error.stack : String(error));
          }
          
          // Initialize Personalize SDK after segments are ready
          try {
            const personalizeService = await import('./personalize');
            console.log('[PreferenceTracking] 🔍 Initializing Personalize SDK with user:', userData.user_id);
            
            // Wait a bit for segments to be fully processed
            setTimeout(async () => {
              await personalizeService.default.initWithUser(
                userData.user_id,
                userData.email
              );
            }, 1000);
          } catch (error) {
            console.error('[PreferenceTracking] ❌ Failed to initialize Personalize SDK:', error);
          }
        }
      });

      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[PreferenceTracking] ✅ Preferences synced to Lytics:', {
          email: userData.email,
          preferences: {
            goal: preferences.goal,
            role: preferences.role,
            education: preferences.education,
            topics_count: preferences.topics?.length || 0,
            schedule: preferences.schedule,
            daily_goal_minutes: preferences.daily_goal_minutes,
          },
        });
      }
    } catch (error) {
      // Handle errors gracefully - don't break the app
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error syncing preferences to Lytics:', error);
      }
    }
  };

  // Start checking for Lytics
  checkAndSync();
}

/**
 * Track when user views a course
 * Sends event to Lytics for analytics and personalization
 */
export function trackCourseView(
  courseData: {
    course_slug: string;
    course_title?: string;
    course_category?: string;
    instructor_name?: string;
  }
) {
  lyticsService.trackCourseView({
    slug: courseData.course_slug,
    title: courseData.course_title,
    category: courseData.course_category,
    instructor_name: courseData.instructor_name,
  });
}

export function trackCourseClick(
  courseData: {
    course_slug: string;
    course_title?: string;
    course_category?: string;
    course_url?: string;
  }
) {
  lyticsService.trackClick('course_card', {
    course_slug: courseData.course_slug,
    course_title: courseData.course_title,
    course_category: courseData.course_category,
    course_url: courseData.course_url,
  });
}


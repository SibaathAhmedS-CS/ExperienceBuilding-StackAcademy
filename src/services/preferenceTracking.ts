// services/preferenceTracking.ts
'use client';

/**
 * Track user preferences for Contentstack Personalize and Lytics
 * Syncs user preferences from Supabase to Lytics for audience matching
 */

import { identifyUser } from '@/lib/lytics';

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
  preferences: UserPreferences
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

      // Use identifyUser helper which handles field mapping and audience fetching
      identifyUser({
        email: userData.email,
        user_id: userData.user_id,
        full_name: userData.full_name,
        goal: preferences.goal,
        role: preferences.role,
        education: preferences.education,
        topics: preferences.topics || [],
        schedule: preferences.schedule,
        daily_goal_minutes: preferences.daily_goal_minutes,
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
  if (typeof window === 'undefined') return;

  // Check if Lytics is available
  const checkAndSendEvent = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag) {
      // Lytics not loaded yet, retry after a short delay
      setTimeout(checkAndSendEvent, 100);
      return;
    }
  
    // Check if jstag has send method
    if (typeof jstag.send !== 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ jstag.send is not a function');
      }
      return;
    }
  
    try {
      // Prepare event data
      const eventData: Record<string, any> = {
        _e: 'course_view',
        course_slug: courseData.course_slug,
        timestamp: new Date().toISOString(),
      };
  
      // Add optional fields
      if (courseData.course_title) {
        eventData.course_title = courseData.course_title;
      }
      if (courseData.course_category) {
        eventData.course_category = courseData.course_category;
      }
      if (courseData.instructor_name) {
        eventData.instructor_name = courseData.instructor_name;
      }
  
      // Send event to Lytics using jstag.send()
      jstag.send(eventData);
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Course view tracked to Lytics:', eventData);
      }
    } catch (error) {
      // Handle errors gracefully - don't break the click functionality
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error tracking course view to Lytics:', error);
      }
    }
  };
  
  // Start checking for Lytics
  checkAndSendEvent();
}

/**
 * Track when user clicks on a course
 * Sends event to Lytics for analytics and personalization
 */
export function trackCourseClick(
  courseData: {
    course_slug: string;
    course_title?: string;
    course_category?: string;
    course_url?: string;
  }
) {
  if (typeof window === 'undefined') return;

  // Check if Lytics is available
  const checkAndSendEvent = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag) {
      // Lytics not loaded yet, retry after a short delay
      setTimeout(checkAndSendEvent, 100);
      return;
    }
  
    // Check if jstag has send method
    if (typeof jstag.send !== 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ jstag.send is not a function');
      }
      return;
    }
  
    try {
      // Prepare event data
      const eventData: Record<string, any> = {
        _e: 'course_click',
        course_slug: courseData.course_slug,
        timestamp: new Date().toISOString(),
      };
  
      // Add optional fields
      if (courseData.course_title) {
        eventData.course_title = courseData.course_title;
      }
      if (courseData.course_category) {
        eventData.course_category = courseData.course_category;
      }
      if (courseData.course_url) {
        eventData.course_url = courseData.course_url;
      }
  
      // Send event to Lytics using jstag.send()
      jstag.send(eventData);
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Course click tracked to Lytics:', eventData);
      }
    } catch (error) {
      // Handle errors gracefully - don't break the click functionality
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error tracking course click to Lytics:', error);
      }
    }
  };
  
  // Start checking for Lytics
  checkAndSendEvent();
}


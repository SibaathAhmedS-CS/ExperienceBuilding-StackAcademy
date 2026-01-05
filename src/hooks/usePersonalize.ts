'use client';

import { useState, useEffect, useCallback } from 'react';
import Personalize from '@contentstack/personalize-edge-sdk';
import { createClient } from '@/utils/supabase/client';
import { setPersonalizeVariant } from '@/lib/contentstack';

// Personalize Project UID from Contentstack
const PERSONALIZE_PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || '';

// Mapping from our internal audience names to Contentstack Personalize audience names
// These MUST match exactly what's defined in Contentstack Personalize
const AUDIENCE_NAME_MAP: Record<string, string> = {
  'ambitious_beginners': 'Ambitious Beginners',
  'career_transitioners': 'Career Transitioners', 
  'tech_professionals': 'Tech Professionals',
  'ui_explorers': 'UI explorers',
  'intensive_learners': 'Intensive Learners',
  'course_completers': 'course completers',
};

// Experience Short UID from Contentstack Personalize
// This is the Short UID of your Experience (visible in the Experience settings)
const EXPERIENCE_SHORT_UID = '0';

// Mapping from our internal audience names to variant Short UIDs
// These are the Short UID values from Contentstack Personalize Experience
// Based on Variant Group configuration:
// 0: Tech Focused → Tech Professionals
// 1: Completion Focused → course completers
// 2: Intensive Learning → Intensive Learners
// 3: Career Transition → Career Transitioners
// 4: Ambitious Learning → Ambitious Beginners
// 5: UI Focused → UI explorers
const AUDIENCE_VARIANT_UID_MAP: Record<string, string> = {
  'tech_professionals': '0',      // Tech Focused variant
  'course_completers': '1',       // Completion Focused variant
  'intensive_learners': '2',      // Intensive Learning variant
  'career_transitioners': '3',    // Career Transition variant
  'ambitious_beginners': '4',     // Ambitious Learning variant
  'ui_explorers': '5',            // UI Focused variant
};

/**
 * Build the correct variant UID format for Contentstack Personalize
 * Format: cs_personalize_{experience_short_uid}_{variant_short_uid}
 */
function buildVariantUid(variantShortUid: string): string {
  return `cs_personalize_${EXPERIENCE_SHORT_UID}_${variantShortUid}`;
}

interface PersonalizeState {
  isInitialized: boolean;
  variantAlias: string | null;
  audienceName: string | null;
  variantParam: string;  // The x-cs-variant-uid parameter value
  error: Error | null;
}

/**
 * Hook to manage Contentstack Personalize integration
 * Determines user's audience based on Supabase preferences and maps to variant
 */
export function usePersonalize() {
  const [state, setState] = useState<PersonalizeState>({
    isInitialized: false,
    variantAlias: null,
    audienceName: null,
    variantParam: '',
    error: null,
  });

  const supabase = createClient();

  // Determine audience based on user preferences and activity
  // Logic matches Lytics audience definitions exactly
  const determineAudience = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get enrollment data with course domains
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, status, course_domain')
        .eq('user_id', user.id);

      const completedCourses = enrollments?.filter(e => e.status === 'completed') || [];
      const categoriesExplored = [...new Set(enrollments?.map(e => e.course_domain).filter(Boolean) || [])];

      // Extract preference values (these map to Lytics user fields)
      const goal = prefs?.goal || null;           // career_intent in Lytics
      const role = prefs?.role || null;           // job_role in Lytics  
      const education = prefs?.education || null;
      const dailyGoalMinutes = prefs?.daily_goal_minutes || 0;

      // Debug: Log data being used for audience determination
      console.log('[Personalize] 🎯 Audience Data:', {
        goal,
        role,
        education,
        dailyGoalMinutes,
        completedCoursesCount: completedCourses.length,
        categoriesExplored,
      });

      // Audience determination logic - matches Lytics rules exactly
      // Priority order based on specificity

      // 1. Course Completers: has completed courses AND explored development category
      if (completedCourses.length > 0 && categoriesExplored.includes('development')) {
        console.log('[Personalize] ✅ Matched: course_completers');
        return 'course_completers';
      }

      // 2. UI Explorers: exploring for fun AND ux-designer role
      if (goal === 'explore-for-fun' && role === 'ux-designer') {
        console.log('[Personalize] ✅ Matched: ui_explorers');
        return 'ui_explorers';
      }

      // 3. Tech Professionals: growing in current role AND ML engineer role
      if (goal === 'grow-in-my-current-role' && role === 'machine-learning-engineer') {
        console.log('[Personalize] ✅ Matched: tech_professionals');
        return 'tech_professionals';
      }

      // 4. Intensive Learners: 30+ min/day AND (change-career OR grow-in-role)
      if (dailyGoalMinutes >= 30 && 
          (goal === 'change-my-career' || goal === 'grow-in-my-current-role')) {
        console.log('[Personalize] ✅ Matched: intensive_learners');
        return 'intensive_learners';
      }

      // 5. Career Transitioners: change career AND bachelor's degree
      // Note: "Bachelor's Degree" becomes "bachelors-degree" via labelToSlug (apostrophe is removed)
      if (goal === 'change-my-career' && education === 'bachelors-degree') {
        console.log('[Personalize] ✅ Matched: career_transitioners');
        return 'career_transitioners';
      }

      // 6. Ambitious Beginners: starting career AND 30+ min/day
      if (goal === 'start-my-career' && dailyGoalMinutes > 30) {
        console.log('[Personalize] ✅ Matched: ambitious_beginners');
        return 'ambitious_beginners';
      }

      // Fallback matching based on primary goal (most specific first)
      if (completedCourses.length > 0) {
        console.log('[Personalize] ✅ Matched (fallback): course_completers');
        return 'course_completers';
      }
      
      // Match based on primary career intent
      switch (goal) {
        case 'explore-for-fun':
          console.log('[Personalize] ✅ Matched (by goal): ui_explorers');
          return 'ui_explorers';
        case 'grow-in-my-current-role':
          console.log('[Personalize] ✅ Matched (by goal): tech_professionals');
          return 'tech_professionals';
        case 'change-my-career':
          console.log('[Personalize] ✅ Matched (by goal): career_transitioners');
          return 'career_transitioners';
        case 'start-my-career':
          console.log('[Personalize] ✅ Matched (by goal): ambitious_beginners');
          return 'ambitious_beginners';
      }
      
      // Match by role if no goal match
      if (role === 'ux-designer') {
        console.log('[Personalize] ✅ Matched (by role): ui_explorers');
        return 'ui_explorers';
      }
      if (role === 'machine-learning-engineer' || role === 'software-developer' || role === 'data-scientist') {
        console.log('[Personalize] ✅ Matched (by role): tech_professionals');
        return 'tech_professionals';
      }

      // Default: ambitious beginners (new users without preferences)
      console.log('[Personalize] ✅ Default: ambitious_beginners');
      return 'ambitious_beginners';
    } catch (error) {
      console.error('[Personalize] Error determining audience:', error);
      return null;
    }
  }, [supabase]);

  // Initialize Personalize SDK and determine audience
  useEffect(() => {
    const initPersonalize = async () => {
      try {
        // Determine user's audience from Supabase data
        const audienceName = await determineAudience();
        
        // Get the Personalize audience name (for SDK) and variant Short UID (for API)
        const personalizeAudienceName = audienceName ? AUDIENCE_NAME_MAP[audienceName] : null;
        const variantShortUid = audienceName ? AUDIENCE_VARIANT_UID_MAP[audienceName] : null;

        let variantParam = '';

        // Try to initialize Personalize SDK if project UID is configured
        if (PERSONALIZE_PROJECT_UID && personalizeAudienceName) {
          try {
            // Initialize Personalize SDK with the project UID
            Personalize.init(PERSONALIZE_PROJECT_UID, {
              edgeMode: true,
            });

            // Set the audience(s) using the EXACT name from Contentstack Personalize
            Personalize.setAudiences([personalizeAudienceName]);

            // Get the variant parameter from Personalize SDK
            const personalizeData = Personalize.get();
            
            // Try to get variant info from SDK
            if (personalizeData?.variantParam) {
              variantParam = personalizeData.variantParam;
            } else if (variantShortUid) {
              // SDK didn't return a variant - build it manually using correct format
              variantParam = buildVariantUid(variantShortUid);
            }
          } catch (e) {
            // Fallback to building variant UID manually
            if (variantShortUid) {
              variantParam = buildVariantUid(variantShortUid);
            }
          }
        } else if (variantShortUid) {
          // No Personalize project configured, build variant UID manually
          variantParam = buildVariantUid(variantShortUid);
        }
        
        // Debug: Log the final personalization result (minimal logging)
        console.log(`[Personalize] 🎭 Result:`, {
          audience: audienceName,
          variantParam: variantParam || 'base',
        });

        // Store variant for global access in Contentstack lib
        if (variantParam) {
          setPersonalizeVariant(variantParam);
        }

        setState({
          isInitialized: true,
          variantAlias: variantShortUid,  // Use Short UID as the variant alias
          audienceName,
          variantParam,
          error: null,
        });

      } catch (error) {
        console.error('[Personalize] Initialization error:', error);
        setState({
          isInitialized: true,
          variantAlias: null,
          audienceName: null,
          variantParam: '',
          error: error instanceof Error ? error : new Error('Failed to initialize'),
        });
      }
    };

    initPersonalize();
  }, [determineAudience]);

  // Get variant parameters for API calls
  const getVariantParams = useCallback(() => {
    if (!state.variantParam) return {};
    
    return {
      'x-cs-variant-uid': state.variantParam,
    };
  }, [state.variantParam]);

  return {
    ...state,
    getVariantParams,
    refreshAudience: determineAudience,
  };
}

/**
 * Get the current variant alias (can be used in non-hook contexts)
 */
export function getStoredVariantAlias(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('personalize_variant_alias');
  } catch {
    return null;
  }
}

/**
 * Store variant alias for persistence
 */
export function storeVariantAlias(alias: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (alias) {
      localStorage.setItem('personalize_variant_alias', alias);
    } else {
      localStorage.removeItem('personalize_variant_alias');
    }
  } catch {
    // Ignore storage errors
  }
}


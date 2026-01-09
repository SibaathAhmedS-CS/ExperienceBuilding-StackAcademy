/**
 * Contentstack Personalize SDK Service
 * Based on reference implementation pattern
 */

// @ts-ignore - Package may not have types
import Personalize from '@contentstack/personalize-edge-sdk';
import { getUserSegments } from './lytics';

let personalizeSdk: any = null;
let personalizeInitialized = false;

const PERSONALIZE_EDGE_API_URL = 'https://personalize-edge.contentstack.com';

export const initPersonalize = async (config: {
  projectUid?: string;
  userId?: string;
  liveAttributes?: Record<string, unknown>;
} = {}): Promise<any> => {
  
  if (personalizeInitialized && personalizeSdk) {
    return personalizeSdk;
  }

  try {
    const projectUid = config.projectUid || process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;


    if (!projectUid) {
      console.error('[Personalize] ❌ DEBUG: projectUid is required - initialization aborted');
      return null;
    }

    if (Personalize.setEdgeApiUrl) {
      Personalize.setEdgeApiUrl(PERSONALIZE_EDGE_API_URL);
    }

    const initOptions: Record<string, unknown> = {};
    
    if (config.userId) {
      initOptions.userId = config.userId;
    }

    if (config.liveAttributes) {
      initOptions.liveAttributes = config.liveAttributes;
    }


    // For client-side, create Request object
    if (typeof window !== 'undefined') {
      const personalizeRequest = new Request(window.location.href, {
        method: 'GET',
        headers: new Headers(),
      });
      personalizeSdk = await Personalize.init(projectUid, {
        request: personalizeRequest,
        ...initOptions
      });
    } else {
      personalizeSdk = await Personalize.init(projectUid, Object.keys(initOptions).length > 0 ? initOptions : undefined);
    }

    personalizeInitialized = true;
    
    const experiences = personalizeSdk.getExperiences?.();
    const variantAliases = personalizeSdk.getVariantAliases?.();
    
    // Check if cs-personalize-manifest cookie was set after initialization
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const manifestCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('cs-personalize-manifest='));
        
        if (manifestCookie) {
        } else {
        }
      }, 1000); // Wait 1 second for cookie to be set
    }
    
    return personalizeSdk;
  } catch (error) {
    console.error('[Personalize] ❌ Failed to initialize Personalize SDK:', error);
    
    // Check for specific error types that might prevent manifest fetch
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('[Personalize] ❌ Network error: Could not reach Edge API');
      console.error('[Personalize] ❌ Edge API URL:', PERSONALIZE_EDGE_API_URL);
      console.error('[Personalize] ❌ This will prevent cs-personalize-manifest cookie from being set');
    } else if (error instanceof Error) {
      console.error('[Personalize] ❌ Error details:', error.message);
    }
    
    return null;
  }
};

export const getPersonalize = (): any => {
  if (!personalizeInitialized || !personalizeSdk) {
    return null;
  }
  return personalizeSdk;
};

export const getExperiences = (): any[] => {
  const sdk = getPersonalize();
  if (!sdk) return [];
  return sdk.getExperiences?.() || [];
};

export const getVariants = (): Record<string, unknown> => {
  const sdk = getPersonalize();
  if (!sdk) {
    return {};
  }
  const variants = sdk.getVariants?.() || {};
  return variants;
};

export const getVariantAliases = (): string[] => {
  const sdk = getPersonalize();
  if (!sdk) {
    return [];
  }
  const aliases = sdk.getVariantAliases?.() || [];
  
  if (aliases.length === 0) {
    const variants = getVariants();
  }
  
  return aliases;
};

export const triggerEvent = async (eventKey: string): Promise<void> => {
  const sdk = getPersonalize();
  if (!sdk) {
    return;
  }
  try {
    await sdk.triggerEvent?.(eventKey);
  } catch (error) {
    console.error('Failed to trigger event:', error);
  }
};

export const setUserAttributes = async (attributes: Record<string, unknown>): Promise<void> => {
  const sdk = getPersonalize();
  if (!sdk) {
    return;
  }
  try {
    await sdk.set?.(attributes);
  } catch (error) {
    console.error('Failed to set user attributes:', error);
  }
};

export const initPersonalizeWithUser = async (userId: string, userEmail: string | null = null): Promise<any> => {
  
  try {
    const lyticsSegments = await getUserSegments();
    
    // Filter out basic segments ('all' and 'smt_new')
    // Only initialize Personalize SDK if user has meaningful segments
    const meaningfulSegments = lyticsSegments.filter(
      segment => segment !== 'all' && segment !== 'smt_new'
    );
    
    
    if (meaningfulSegments.length === 0) {
      return null;
    }
    
    
    const initOptions: {
      userId: string;
      liveAttributes?: Record<string, unknown>;
    } = {
      userId: userId
    };

    if (userEmail) {
      initOptions.liveAttributes = {
        email: userEmail,
        segments: lyticsSegments
      };
    }

    const result = await initPersonalize(initOptions);
    
    if (result) {
    } else {
    }
    
    return result;
  } catch (error) {
    console.error('[Personalize] ❌ DEBUG: Failed to initialize Personalize with user:', error);
    console.error('[Personalize] ❌ DEBUG: Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
};

export const refreshPersonalizeForUser = async (userId: string, userEmail: string | null = null): Promise<any> => {
  personalizeInitialized = false;
  personalizeSdk = null;
  return await initPersonalizeWithUser(userId, userEmail);
};

/**
 * Check initialization status and diagnose issues
 */
export const checkInitializationStatus = async (): Promise<{
  isInitialized: boolean;
  hasProjectUid: boolean;
  segments: string[];
  meaningfulSegments: string[];
  canInitialize: boolean;
  reason?: string;
}> => {
  const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
  const segments = await getUserSegments();
  const meaningfulSegments = segments.filter(
    segment => segment !== 'all' && segment !== 'smt_new'
  );
  
  const canInitialize = meaningfulSegments.length > 0 && !!projectUid;
  let reason = '';
  
  if (!projectUid) {
    reason = 'Missing NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID environment variable';
  } else if (meaningfulSegments.length === 0) {
    reason = `User only has basic segments: ${segments.join(', ')}. Need segments other than 'all' or 'smt_new'`;
  } else {
    reason = 'Ready to initialize';
  }
  
  
  return {
    isInitialized: personalizeInitialized,
    hasProjectUid: !!projectUid,
    segments,
    meaningfulSegments,
    canInitialize,
    reason
  };
};

/**
 * Force initialization (for testing/debugging) - bypasses segment check
 */
export const forceInitPersonalize = async (userId: string, userEmail: string | null = null): Promise<any> => {
  
  const initOptions: {
    userId: string;
    liveAttributes?: Record<string, unknown>;
  } = {
    userId: userId
  };

  if (userEmail) {
    const segments = await getUserSegments();
    initOptions.liveAttributes = {
      email: userEmail,
      segments: segments
    };
  }

  return await initPersonalize(initOptions);
};

/**
 * Mapping from audience names in cs-lytics-audiences cookie to Contentstack Personalize audience names
 * These MUST match exactly what's defined in Contentstack Personalize
 */
const AUDIENCE_NAME_MAP: Record<string, string> = {
  'ui_explorers': 'UI explorers',
  'career_transitioners': 'Career Transitioners',
  'tech_enthusiasts': 'Tech Professionals', // Note: tech_enthusiasts maps to Tech Professionals
  'ambitious_beginners': 'Ambitious Beginners',
  'intensive_learners': 'Intensive Learners',
  'course_completers': 'course completers',
};

/**
 * Experience Short UID from Contentstack Personalize
 * This is the Short UID of your Experience (visible in the Experience settings)
 */
const EXPERIENCE_SHORT_UID = '0';

/**
 * Mapping from audience names to variant Short UIDs
 * Based on Variant Group configuration:
 * 0: Tech Focused → Tech Professionals
 * 1: Completion Focused → course completers
 * 2: Intensive Learning → Intensive Learners
 * 3: Career Transition → Career Transitioners
 * 4: Ambitious Learning → Ambitious Beginners
 * 5: UI Focused → UI explorers
 */
const AUDIENCE_VARIANT_UID_MAP: Record<string, string> = {
  'ui_explorers': '5',            // UI Focused variant
  'career_transitioners': '3',    // Career Transition variant
  'tech_enthusiasts': '0',        // Tech Focused variant (maps to Tech Professionals)
  'ambitious_beginners': '4',     // Ambitious Learning variant
  'intensive_learners': '2',      // Intensive Learning variant
  'course_completers': '1',       // Completion Focused variant
};

/**
 * Build the correct variant UID format for Contentstack Personalize
 * Format: cs_personalize_{experience_short_uid}_{variant_short_uid}
 */
function buildVariantUid(variantShortUid: string): string {
  return `cs_personalize_${EXPERIENCE_SHORT_UID}_${variantShortUid}`;
}

/**
 * Read segments from cs-lytics-audiences cookie
 */
function getSegmentsFromCookie(): string[] {
  if (typeof document === 'undefined') return [];

  const csAudiencesCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('cs-lytics-audiences='));

  if (csAudiencesCookie) {
    try {
      const cookieValue = csAudiencesCookie.split('=')[1];
      if (cookieValue) {
        // Handle pipe-delimited format: |segment1|segment2|segment3|
        if (cookieValue.startsWith('|') && cookieValue.endsWith('|')) {
          const segments = cookieValue
            .split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          return segments;
        }

        // Try parsing as JSON first (in case it's an array)
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieValue));
          if (Array.isArray(parsed)) {
            return parsed.filter(Boolean);
          } else if (typeof parsed === 'string') {
            // If it's a string, try pipe-delimited or comma-separated
            if (parsed.includes('|')) {
              return parsed.split('|').map(s => s.trim()).filter(Boolean);
            }
            return parsed.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch {
          // If not JSON, check if it's pipe-delimited or comma-separated
          if (cookieValue.includes('|')) {
            return cookieValue.split('|').map(s => s.trim()).filter(Boolean);
          }
          // Otherwise treat as comma-separated string
          return cookieValue.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } catch (error) {
    }
  }

  return [];
}

/**
 * Determine audience from database (preferences and enrollments) as fallback
 * Based on audience definitions:
 * - ui_explorers: goal = explore-for-fun, role = ux-designer
 * - career_transitioners: goal = change-my-career, schedule > 30 (daily_goal_minutes > 30)
 * - tech_enthusiasts: goal = explore-for-fun, role = software-engineer, interest contains python
 * - ambitious_beginners: goal = start-my-career, role = machine-learning-engineer, schedule > 30
 * - intensive_learners: goal = grow-in-my-role, role = machine-learning-engineer, schedule > 30
 * - course_completers: completed course = completed, goal = grow-in-my-role, education = bachelor-s-degree
 */
async function determineAudienceFromDatabase(
  userId: string,
  supabase: any
): Promise<string | null> {
  
  try {
    // Fetch user preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('goal, role, education, topics, schedule, daily_goal_minutes')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('[Personalize] ❌ Error fetching preferences:', prefsError);
      console.error('[Personalize] ❌ Error details:', JSON.stringify(prefsError, null, 2));
      return null;
    }

    if (!preferences) {
      return null;
    }


    // Fetch completed courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (enrollmentsError) {
      console.error('[Personalize] ⚠️ Error fetching enrollments:', enrollmentsError);
    } else {
    }

    const hasCompletedCourses = (enrollments?.length || 0) > 0;
    const goal = preferences.goal;
    const role = preferences.role;
    const education = preferences.education;
    const dailyGoalMinutes = preferences.daily_goal_minutes || 0;
    const topics = preferences.topics || [];


    // Check conditions in priority order (most specific first)

    // 1. course_completers: completed course = completed, goal = grow-in-my-role, education = bachelor-s-degree
    // Handle both "bachelor-s-degree" and "bachelors-degree" formats
    // Handle both "grow-in-my-role" and "grow-in-my-current-role" formats
    const isBachelorsDegree = education === 'bachelor-s-degree' || education === 'bachelors-degree';
    const isGrowInRoleForCompleters = goal === 'grow-in-my-role' || goal === 'grow-in-my-current-role';
    if (hasCompletedCourses && isGrowInRoleForCompleters && isBachelorsDegree) {
      return 'course_completers';
    }

    // 2. ui_explorers: goal = explore-for-fun, role = ux-designer
    if (goal === 'explore-for-fun' && role === 'ux-designer') {
      return 'ui_explorers';
    }

    // 3. tech_enthusiasts: goal = explore-for-fun, role = software-engineer, interest contains python
    const hasPythonTopic = topics.some((topic: string) => topic.toLowerCase().includes('python'));
    if (goal === 'explore-for-fun' && role === 'software-engineer' && hasPythonTopic) {
      return 'tech_enthusiasts';
    }

    // 4. ambitious_beginners: goal = start-my-career, role = machine-learning-engineer, schedule > 30
    if (goal === 'start-my-career' && role === 'machine-learning-engineer' && dailyGoalMinutes > 30) {
      return 'ambitious_beginners';
    }

    // 5. intensive_learners: goal = grow-in-my-role, role = machine-learning-engineer, schedule > 30
    // Handle both "grow-in-my-role" and "grow-in-my-current-role" formats
    const isGrowInRole = goal === 'grow-in-my-role' || goal === 'grow-in-my-current-role';
    if (isGrowInRole && role === 'machine-learning-engineer' && dailyGoalMinutes > 30) {
      return 'intensive_learners';
    }

    // 6. career_transitioners: goal = change-my-career, schedule > 30
    if (goal === 'change-my-career' && dailyGoalMinutes > 30) {
      return 'career_transitioners';
    }

    // Fallback: if user has completed courses, default to course_completers
    if (hasCompletedCourses) {
      return 'course_completers';
    }

    return null;
  } catch (error) {
    console.error('[Personalize] ❌ Error determining audience from database:', error);
    return null;
  }
}

/**
 * Set variant based on audience name
 */
async function setVariantFromAudience(audience: string): Promise<string | null> {
  // Get variant Short UID for the matched audience
  const variantShortUid = AUDIENCE_VARIANT_UID_MAP[audience];
  if (!variantShortUid) {
    return null;
  }

  // Build variant UID
  const variantUid = buildVariantUid(variantShortUid);

  // Set the variant globally
  const { setPersonalizeVariant } = await import('@/lib/contentstack');
  setPersonalizeVariant(variantUid);

  // Also set audiences in Personalize SDK if initialized
  if (personalizeInitialized && personalizeSdk) {
    const personalizeAudienceName = AUDIENCE_NAME_MAP[audience];
    if (personalizeAudienceName) {
      try {
        if (typeof personalizeSdk.setAudiences === 'function') {
          personalizeSdk.setAudiences([personalizeAudienceName]);
        }
      } catch (error) {
      }
    }
  }

  return variantUid;
}

/**
 * Fetch variant from cs-lytics-audiences cookie based on audience names
 * If the cookie contains any of the listed audiences, fetch the variant directly
 * If cookie is not present, fallback to determining audience from database
 * and set it using setPersonalizeVariant
 */
export const fetchVariantFromAudiences = async (
  userId?: string,
  supabase?: any
): Promise<string | null> => {

  if (typeof document === 'undefined') {
    // Try fallback if userId and supabase are provided
    if (userId && supabase) {
      const audience = await determineAudienceFromDatabase(userId, supabase);
      if (audience) {
        return await setVariantFromAudience(audience);
      }
    }
    return null;
  }

  try {
    // Get segments from cookie
    const segments = getSegmentsFromCookie();

    // List of audiences we're looking for
    const targetAudiences = [
      'ui_explorers',
      'career_transitioners',
      'tech_enthusiasts',
      'ambitious_beginners',
      'intensive_learners',
      'course_completers'
    ];

    // Find the first matching audience (priority order)
    let matchedAudience: string | null = null;
    if (segments.length > 0) {
      
      for (const audience of targetAudiences) {
        const isInSegments = segments.includes(audience);
        if (isInSegments) {
          matchedAudience = audience;
          break;
        }
      }
      
      if (!matchedAudience) {
      }
    } else {
    }

    // If no audience found in cookie (or cookie is empty), try fallback from database
    if (!matchedAudience) {
      
      // Always try database fallback if userId and supabase are provided
      if (userId && supabase) {
        
        try {
          matchedAudience = await determineAudienceFromDatabase(userId, supabase);
          
          if (matchedAudience) {
          } else {
            return null;
          }
        } catch (dbError) {
          console.error('[Personalize] ❌ ❌ ❌ ERROR in database fallback:', dbError);
          console.error('[Personalize] ❌ Error details:', dbError instanceof Error ? dbError.stack : String(dbError));
          return null;
        }
      } else {
        console.error('[Personalize] ❌ ❌ ❌ Cannot trigger database fallback - missing userId or supabase');
        console.error('[Personalize] ❌ userId:', userId, 'supabase:', !!supabase);
        return null;
      }
    }

    // Set variant based on matched audience
    if (matchedAudience) {
      const variantUid = await setVariantFromAudience(matchedAudience);
      return variantUid;
    }

    return null;
  } catch (error) {
    console.error('[Personalize] ❌ Error fetching variant from audiences:', error);
    console.error('[Personalize] ❌ Error details:', error instanceof Error ? error.message : String(error));
    // Even on error, try database fallback if possible
    if (userId && supabase) {
      try {
        const audience = await determineAudienceFromDatabase(userId, supabase);
        if (audience) {
          return await setVariantFromAudience(audience);
        }
      } catch (fallbackError) {
        console.error('[Personalize] ❌ Database fallback also failed:', fallbackError);
      }
    }
    return null;
  }
};

export default {
  init: initPersonalize,
  initWithUser: initPersonalizeWithUser,
  refreshForUser: refreshPersonalizeForUser,
  getInstance: getPersonalize,
  getExperiences,
  getVariantAliases,
  triggerEvent,
  setUserAttributes,
  checkStatus: checkInitializationStatus,
  forceInit: forceInitPersonalize,
  fetchVariantFromAudiences
};

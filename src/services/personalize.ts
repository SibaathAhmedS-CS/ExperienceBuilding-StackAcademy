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
  console.log('[Personalize] 🔍 DEBUG: initPersonalize called');
  console.log('[Personalize] 🔍 DEBUG: Config:', {
    hasProjectUid: !!config.projectUid,
    userId: config.userId,
    hasLiveAttributes: !!config.liveAttributes,
    alreadyInitialized: personalizeInitialized
  });
  
  if (personalizeInitialized && personalizeSdk) {
    console.warn('[Personalize] ⚠️ DEBUG: SDK already initialized, returning existing instance');
    return personalizeSdk;
  }

  try {
    const projectUid = config.projectUid || process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;

    console.log('[Personalize] 🔍 DEBUG: Project UID:', projectUid ? 'Found' : 'Missing');

    if (!projectUid) {
      console.error('[Personalize] ❌ DEBUG: projectUid is required - initialization aborted');
      return null;
    }

    if (Personalize.setEdgeApiUrl) {
      Personalize.setEdgeApiUrl(PERSONALIZE_EDGE_API_URL);
      console.log('[Personalize] 🔍 DEBUG: Set Edge API URL to:', PERSONALIZE_EDGE_API_URL);
    }

    const initOptions: Record<string, unknown> = {};
    
    if (config.userId) {
      initOptions.userId = config.userId;
      console.log('[Personalize] 🔍 DEBUG: User ID set:', config.userId);
    }

    if (config.liveAttributes) {
      initOptions.liveAttributes = config.liveAttributes;
      console.log('[Personalize] 🔍 DEBUG: Live attributes set:', {
        keys: Object.keys(config.liveAttributes),
        hasSegments: 'segments' in config.liveAttributes,
        segments: (config.liveAttributes as any).segments
      });
    }

    console.log('[Personalize] 🔍 DEBUG: Initialization options:', {
      hasUserId: !!initOptions.userId,
      hasLiveAttributes: !!initOptions.liveAttributes,
      isClientSide: typeof window !== 'undefined'
    });

    // For client-side, create Request object
    if (typeof window !== 'undefined') {
      console.log('[Personalize] 🔍 DEBUG: Client-side initialization - creating Request object');
      const personalizeRequest = new Request(window.location.href, {
        method: 'GET',
        headers: new Headers(),
      });
      console.log('[Personalize] 🔍 DEBUG: Calling Personalize.init() with projectUid and options...');
      personalizeSdk = await Personalize.init(projectUid, {
        request: personalizeRequest,
        ...initOptions
      });
      console.log('[Personalize] ✅ DEBUG: Personalize.init() completed (client-side)');
    } else {
      console.log('[Personalize] 🔍 DEBUG: Server-side initialization');
      console.log('[Personalize] 🔍 DEBUG: Calling Personalize.init() with projectUid and options...');
      personalizeSdk = await Personalize.init(projectUid, Object.keys(initOptions).length > 0 ? initOptions : undefined);
      console.log('[Personalize] ✅ DEBUG: Personalize.init() completed (server-side)');
    }

    personalizeInitialized = true;
    console.log('[Personalize] ✅ DEBUG: SDK initialized successfully!', {
      projectUid,
      userId: config.userId,
      hasLiveAttributes: !!config.liveAttributes,
      timestamp: new Date().toISOString()
    });
    
    const experiences = personalizeSdk.getExperiences?.();
    const variantAliases = personalizeSdk.getVariantAliases?.();
    console.log('[Personalize] Initial experiences:', experiences);
    console.log('[Personalize] Initial variant aliases:', variantAliases);
    
    // Check if cs-personalize-manifest cookie was set after initialization
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const manifestCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('cs-personalize-manifest='));
        
        if (manifestCookie) {
          console.log('[Personalize] ✅ cs-personalize-manifest cookie found:', manifestCookie.substring(0, 100) + '...');
        } else {
          console.warn('[Personalize] ⚠️ cs-personalize-manifest cookie NOT found after initialization');
          console.warn('[Personalize] ⚠️ This may indicate the manifest fetch failed or cookie was not set');
          console.warn('[Personalize] ⚠️ Available cookies:', document.cookie.split('; ').map(c => c.split('=')[0]).join(', '));
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
    console.warn('Personalize SDK not initialized. Call initPersonalize() first.');
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
    console.warn('[Personalize] SDK not initialized, cannot get variants');
    return {};
  }
  const variants = sdk.getVariants?.() || {};
  console.log('[Personalize] Variants from SDK:', variants);
  return variants;
};

export const getVariantAliases = (): string[] => {
  const sdk = getPersonalize();
  if (!sdk) {
    console.warn('[Personalize] SDK not initialized, cannot get variant aliases');
    return [];
  }
  const aliases = sdk.getVariantAliases?.() || [];
  console.log('[Personalize] Variant aliases from SDK:', aliases);
  
  if (aliases.length === 0) {
    const variants = getVariants();
    console.log('[Personalize] No variant aliases, checking variants object:', variants);
  }
  
  return aliases;
};

export const triggerEvent = async (eventKey: string): Promise<void> => {
  const sdk = getPersonalize();
  if (!sdk) {
    console.warn('Personalize SDK not initialized. Cannot trigger event.');
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
    console.warn('Personalize SDK not initialized. Cannot set user attributes.');
    return;
  }
  try {
    await sdk.set?.(attributes);
  } catch (error) {
    console.error('Failed to set user attributes:', error);
  }
};

export const initPersonalizeWithUser = async (userId: string, userEmail: string | null = null): Promise<any> => {
  console.log('[Personalize] 🔍 DEBUG: initPersonalizeWithUser called');
  console.log('[Personalize] 🔍 DEBUG: Parameters:', {
    userId,
    userEmail: userEmail || 'null',
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log('[Personalize] 🔍 DEBUG: Fetching user segments from Lytics...');
    const lyticsSegments = await getUserSegments();
    console.log('[Personalize] 🔍 DEBUG: Received segments:', {
      allSegments: lyticsSegments,
      segmentCount: lyticsSegments.length
    });
    
    // Filter out basic segments ('all' and 'smt_new')
    // Only initialize Personalize SDK if user has meaningful segments
    const meaningfulSegments = lyticsSegments.filter(
      segment => segment !== 'all' && segment !== 'smt_new'
    );
    
    console.log('[Personalize] 🔍 DEBUG: Segment analysis:', {
      allSegments: lyticsSegments,
      meaningfulSegments: meaningfulSegments,
      meaningfulCount: meaningfulSegments.length,
      basicSegmentsOnly: meaningfulSegments.length === 0
    });
    
    if (meaningfulSegments.length === 0) {
      console.log('[Personalize] ⏭️ DEBUG: Skipping initialization - user only has basic segments (all/smt_new)');
      console.log('[Personalize] ⏭️ DEBUG: All segments:', lyticsSegments);
      console.log('[Personalize] ⏭️ DEBUG: Reason: No meaningful segments found for personalization');
      return null;
    }
    
    console.log('[Personalize] ✅ DEBUG: Proceeding with initialization - user has meaningful segments');
    console.log('[Personalize] ✅ DEBUG: Meaningful segments:', meaningfulSegments);
    
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

    console.log('[Personalize] 🔍 DEBUG: Calling initPersonalize() with options...');
    const result = await initPersonalize(initOptions);
    
    if (result) {
      console.log('[Personalize] ✅ DEBUG: initPersonalizeWithUser completed successfully');
    } else {
      console.log('[Personalize] ⚠️ DEBUG: initPersonalizeWithUser returned null');
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
  console.log('[Personalize] 🔄 DEBUG: Refreshing Personalize SDK for user');
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
  
  console.log('[Personalize] 🔍 DEBUG: Initialization Status Check:', {
    isInitialized: personalizeInitialized,
    hasProjectUid: !!projectUid,
    segments,
    meaningfulSegments,
    canInitialize,
    reason
  });
  
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
  console.log('[Personalize] ⚠️ DEBUG: FORCE INITIALIZATION - bypassing segment check');
  console.log('[Personalize] ⚠️ DEBUG: This should only be used for testing!');
  
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
      console.warn('[Personalize] ⚠️ Error parsing cs-lytics-audiences cookie:', error);
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
  console.log('[Personalize] 🔄 ========== DATABASE FALLBACK STARTED ==========');
  console.log('[Personalize] 🔄 User ID:', userId);
  
  try {
    // Fetch user preferences
    console.log('[Personalize] 🔄 Fetching user preferences from database...');
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
      console.log('[Personalize] ⚠️ No preferences found for user');
      return null;
    }

    console.log('[Personalize] ✅ Preferences fetched:', JSON.stringify(preferences, null, 2));

    // Fetch completed courses
    console.log('[Personalize] 🔄 Fetching enrollments from database...');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (enrollmentsError) {
      console.error('[Personalize] ⚠️ Error fetching enrollments:', enrollmentsError);
    } else {
      console.log('[Personalize] ✅ Enrollments fetched:', {
        count: enrollments?.length || 0,
        enrollments: enrollments
      });
    }

    const hasCompletedCourses = (enrollments?.length || 0) > 0;
    const goal = preferences.goal;
    const role = preferences.role;
    const education = preferences.education;
    const dailyGoalMinutes = preferences.daily_goal_minutes || 0;
    const topics = preferences.topics || [];

    console.log('[Personalize] 🔍 ========== AUDIENCE DETERMINATION ==========');
    console.log('[Personalize] 🔍 Database values fetched:');
    console.log('[Personalize] 🔍   - goal:', goal, `(${typeof goal})`);
    console.log('[Personalize] 🔍   - role:', role, `(${typeof role})`);
    console.log('[Personalize] 🔍   - education:', education, `(${typeof education})`);
    console.log('[Personalize] 🔍   - daily_goal_minutes:', dailyGoalMinutes, `(${typeof dailyGoalMinutes})`);
    console.log('[Personalize] 🔍   - topics:', topics, `(${Array.isArray(topics) ? 'array' : typeof topics})`);
    console.log('[Personalize] 🔍   - hasCompletedCourses:', hasCompletedCourses);
    console.log('[Personalize] 🔍 ===========================================');

    // Check conditions in priority order (most specific first)
    console.log('[Personalize] 🔍 Checking audience conditions in priority order...');

    // 1. course_completers: completed course = completed, goal = grow-in-my-role, education = bachelor-s-degree
    // Handle both "bachelor-s-degree" and "bachelors-degree" formats
    // Handle both "grow-in-my-role" and "grow-in-my-current-role" formats
    const isBachelorsDegree = education === 'bachelor-s-degree' || education === 'bachelors-degree';
    const isGrowInRoleForCompleters = goal === 'grow-in-my-role' || goal === 'grow-in-my-current-role';
    console.log('[Personalize] 🔍 [1] course_completers check:');
    console.log('[Personalize] 🔍   - hasCompletedCourses:', hasCompletedCourses);
    console.log('[Personalize] 🔍   - isGrowInRoleForCompleters:', isGrowInRoleForCompleters, `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - isBachelorsDegree:', isBachelorsDegree, `(education: ${education})`);
    if (hasCompletedCourses && isGrowInRoleForCompleters && isBachelorsDegree) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: course_completers');
      return 'course_completers';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // 2. ui_explorers: goal = explore-for-fun, role = ux-designer
    console.log('[Personalize] 🔍 [2] ui_explorers check:');
    console.log('[Personalize] 🔍   - goal === "explore-for-fun":', goal === 'explore-for-fun', `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - role === "ux-designer":', role === 'ux-designer', `(role: ${role})`);
    if (goal === 'explore-for-fun' && role === 'ux-designer') {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: ui_explorers');
      return 'ui_explorers';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // 3. tech_enthusiasts: goal = explore-for-fun, role = software-engineer, interest contains python
    const hasPythonTopic = topics.some((topic: string) => topic.toLowerCase().includes('python'));
    console.log('[Personalize] 🔍 [3] tech_enthusiasts check:');
    console.log('[Personalize] 🔍   - goal === "explore-for-fun":', goal === 'explore-for-fun', `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - role === "software-engineer":', role === 'software-engineer', `(role: ${role})`);
    console.log('[Personalize] 🔍   - hasPythonTopic:', hasPythonTopic, `(topics: ${JSON.stringify(topics)})`);
    if (goal === 'explore-for-fun' && role === 'software-engineer' && hasPythonTopic) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: tech_enthusiasts');
      return 'tech_enthusiasts';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // 4. ambitious_beginners: goal = start-my-career, role = machine-learning-engineer, schedule > 30
    console.log('[Personalize] 🔍 [4] ambitious_beginners check:');
    console.log('[Personalize] 🔍   - goal === "start-my-career":', goal === 'start-my-career', `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - role === "machine-learning-engineer":', role === 'machine-learning-engineer', `(role: ${role})`);
    console.log('[Personalize] 🔍   - dailyGoalMinutes > 30:', dailyGoalMinutes > 30, `(dailyGoalMinutes: ${dailyGoalMinutes})`);
    if (goal === 'start-my-career' && role === 'machine-learning-engineer' && dailyGoalMinutes > 30) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: ambitious_beginners');
      return 'ambitious_beginners';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // 5. intensive_learners: goal = grow-in-my-role, role = machine-learning-engineer, schedule > 30
    // Handle both "grow-in-my-role" and "grow-in-my-current-role" formats
    const isGrowInRole = goal === 'grow-in-my-role' || goal === 'grow-in-my-current-role';
    console.log('[Personalize] 🔍 [5] intensive_learners check:');
    console.log('[Personalize] 🔍   - isGrowInRole:', isGrowInRole, `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - role === "machine-learning-engineer":', role === 'machine-learning-engineer', `(role: ${role})`);
    console.log('[Personalize] 🔍   - dailyGoalMinutes > 30:', dailyGoalMinutes > 30, `(dailyGoalMinutes: ${dailyGoalMinutes})`);
    if (isGrowInRole && role === 'machine-learning-engineer' && dailyGoalMinutes > 30) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: intensive_learners');
      return 'intensive_learners';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // 6. career_transitioners: goal = change-my-career, schedule > 30
    console.log('[Personalize] 🔍 [6] career_transitioners check:');
    console.log('[Personalize] 🔍   - goal === "change-my-career":', goal === 'change-my-career', `(goal: ${goal})`);
    console.log('[Personalize] 🔍   - dailyGoalMinutes > 30:', dailyGoalMinutes > 30, `(dailyGoalMinutes: ${dailyGoalMinutes})`);
    if (goal === 'change-my-career' && dailyGoalMinutes > 30) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED: career_transitioners');
      return 'career_transitioners';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    // Fallback: if user has completed courses, default to course_completers
    console.log('[Personalize] 🔍 [Fallback] course_completers check:');
    console.log('[Personalize] 🔍   - hasCompletedCourses:', hasCompletedCourses);
    if (hasCompletedCourses) {
      console.log('[Personalize] ✅ ✅ ✅ MATCHED (Fallback): course_completers');
      return 'course_completers';
    }
    console.log('[Personalize] ⚠️   - Condition NOT met');

    console.log('[Personalize] ⚠️ ⚠️ ⚠️ NO AUDIENCE MATCHED FROM DATABASE');
    console.log('[Personalize] 🔄 ========== DATABASE FALLBACK ENDED (NO MATCH) ==========');
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
    console.warn('[Personalize] ⚠️ No variant UID mapping found for audience:', audience);
    return null;
  }

  // Build variant UID
  const variantUid = buildVariantUid(variantShortUid);
  console.log('[Personalize] 🎭 Built variant UID:', variantUid);

  // Set the variant globally
  const { setPersonalizeVariant } = await import('@/lib/contentstack');
  setPersonalizeVariant(variantUid);
  console.log('[Personalize] ✅ Variant set globally:', variantUid);

  // Also set audiences in Personalize SDK if initialized
  if (personalizeInitialized && personalizeSdk) {
    const personalizeAudienceName = AUDIENCE_NAME_MAP[audience];
    if (personalizeAudienceName) {
      try {
        if (typeof personalizeSdk.setAudiences === 'function') {
          personalizeSdk.setAudiences([personalizeAudienceName]);
          console.log('[Personalize] ✅ Set audiences in SDK:', [personalizeAudienceName]);
        }
      } catch (error) {
        console.warn('[Personalize] ⚠️ Failed to set audiences in SDK:', error);
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
  console.log('[Personalize] 🚀 fetchVariantFromAudiences called', {
    hasUserId: !!userId,
    hasSupabase: !!supabase,
    userId: userId,
    isClient: typeof document !== 'undefined'
  });

  if (typeof document === 'undefined') {
    console.log('[Personalize] ⚠️ Document not available, cannot fetch variant from audiences');
    // Try fallback if userId and supabase are provided
    if (userId && supabase) {
      console.log('[Personalize] 🔄 Attempting fallback: determining audience from database (server-side)');
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
    console.log('[Personalize] 🔍 Segments from cs-lytics-audiences cookie:', segments);
    console.log('[Personalize] 🔍 Cookie segments length:', segments.length);

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
      console.log('[Personalize] 🔍 ========== CHECKING COOKIE SEGMENTS ==========');
      console.log('[Personalize] 🔍 Cookie segments found:', segments);
      console.log('[Personalize] 🔍 Target audiences to match:', targetAudiences);
      console.log('[Personalize] 🔍 Checking each segment against target audiences...');
      
      for (const audience of targetAudiences) {
        const isInSegments = segments.includes(audience);
        console.log(`[Personalize] 🔍   - Checking "${audience}":`, isInSegments ? '✅ FOUND' : '❌ NOT FOUND');
        if (isInSegments) {
          matchedAudience = audience;
          console.log('[Personalize] ✅ ✅ ✅ MATCHED AUDIENCE FROM COOKIE:', audience);
          break;
        }
      }
      
      if (!matchedAudience) {
        console.log('[Personalize] ⚠️ ⚠️ ⚠️ Cookie has segments but NONE match target audiences');
        console.log('[Personalize] ⚠️ Cookie segments:', JSON.stringify(segments));
        console.log('[Personalize] ⚠️ Target audiences:', JSON.stringify(targetAudiences));
        console.log('[Personalize] ⚠️ Will trigger database fallback...');
      }
      console.log('[Personalize] 🔍 ============================================');
    } else {
      console.log('[Personalize] ⚠️ Cookie is empty or has no segments');
      console.log('[Personalize] ⚠️ Will trigger database fallback...');
    }

    // If no audience found in cookie (or cookie is empty), try fallback from database
    if (!matchedAudience) {
      console.log('[Personalize] 🔄 ========== TRIGGERING DATABASE FALLBACK ==========');
      console.log('[Personalize] 🔄 No matching audience found in cookie');
      console.log('[Personalize] 🔄 Checking if userId and supabase are available...');
      console.log('[Personalize] 🔄   - userId:', userId ? `✅ ${userId}` : '❌ MISSING');
      console.log('[Personalize] 🔄   - supabase:', supabase ? '✅ AVAILABLE' : '❌ MISSING');
      
      // Always try database fallback if userId and supabase are provided
      if (userId && supabase) {
        console.log('[Personalize] 🔄 ✅ Both userId and supabase available - Starting database fallback...');
        
        try {
          matchedAudience = await determineAudienceFromDatabase(userId, supabase);
          
          if (matchedAudience) {
            console.log('[Personalize] ✅ ✅ ✅ MATCHED AUDIENCE FROM DATABASE:', matchedAudience);
            console.log('[Personalize] 🔄 ========== DATABASE FALLBACK SUCCESS ==========');
          } else {
            console.warn('[Personalize] ⚠️ ⚠️ ⚠️ No audience matched from database');
            console.warn('[Personalize] ⚠️ This might mean user preferences don\'t match any audience criteria');
            console.log('[Personalize] 🔄 ========== DATABASE FALLBACK ENDED (NO MATCH) ==========');
            return null;
          }
        } catch (dbError) {
          console.error('[Personalize] ❌ ❌ ❌ ERROR in database fallback:', dbError);
          console.error('[Personalize] ❌ Error details:', dbError instanceof Error ? dbError.stack : String(dbError));
          console.log('[Personalize] 🔄 ========== DATABASE FALLBACK FAILED ==========');
          return null;
        }
      } else {
        console.error('[Personalize] ❌ ❌ ❌ Cannot trigger database fallback - missing userId or supabase');
        console.error('[Personalize] ❌ userId:', userId, 'supabase:', !!supabase);
        console.log('[Personalize] 🔄 ========== DATABASE FALLBACK BLOCKED ==========');
        return null;
      }
    }

    // Set variant based on matched audience
    if (matchedAudience) {
      console.log('[Personalize] 🎯 Setting variant for audience:', matchedAudience);
      const variantUid = await setVariantFromAudience(matchedAudience);
      console.log('[Personalize] ✅ Variant set successfully:', variantUid);
      return variantUid;
    }

    console.warn('[Personalize] ⚠️ No matched audience found, returning null');
    return null;
  } catch (error) {
    console.error('[Personalize] ❌ Error fetching variant from audiences:', error);
    console.error('[Personalize] ❌ Error details:', error instanceof Error ? error.message : String(error));
    // Even on error, try database fallback if possible
    if (userId && supabase) {
      console.log('[Personalize] 🔄 Error occurred, attempting database fallback as last resort');
      try {
        const audience = await determineAudienceFromDatabase(userId, supabase);
        if (audience) {
          console.log('[Personalize] ✅ Database fallback succeeded after error:', audience);
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

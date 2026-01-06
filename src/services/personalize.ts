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
  forceInit: forceInitPersonalize
};

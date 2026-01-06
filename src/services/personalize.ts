/**
 * Contentstack Personalize SDK Service
 * Based on reference implementation pattern
 */

// @ts-ignore - Package may not have types
import Personalize from '@contentstack/personalize-edge-sdk';
import { getUserSegments } from './lytics';

let personalizeSdk: any = null;
let personalizeInitialized = false;

const CONTENTSTACK_REGION = 'us';
const PERSONALIZE_EDGE_API_URL = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL || 
  `https://${CONTENTSTACK_REGION}-personalize-edge.contentstack.com`;

export const initPersonalize = async (config: {
  projectUid?: string;
  userId?: string;
  liveAttributes?: Record<string, unknown>;
} = {}): Promise<any> => {
  if (personalizeInitialized && personalizeSdk) {
    console.warn('Personalize SDK already initialized');
    return personalizeSdk;
  }

  try {
    const projectUid = config.projectUid || process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;

    if (!projectUid) {
      console.error('Personalize SDK: projectUid is required');
      return null;
    }

    if (Personalize.setEdgeApiUrl) {
      Personalize.setEdgeApiUrl(PERSONALIZE_EDGE_API_URL);
      console.log('[Personalize] Set Edge API URL to:', PERSONALIZE_EDGE_API_URL);
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
    console.log('[Personalize] SDK initialized successfully', {
      projectUid,
      userId: config.userId,
      hasLiveAttributes: !!config.liveAttributes
    });
    
    const experiences = personalizeSdk.getExperiences?.();
    const variantAliases = personalizeSdk.getVariantAliases?.();
    console.log('[Personalize] Initial experiences:', experiences);
    console.log('[Personalize] Initial variant aliases:', variantAliases);
    
    return personalizeSdk;
  } catch (error) {
    console.error('Failed to initialize Personalize SDK:', error);
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
  try {
    const lyticsSegments = await getUserSegments();
    
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

    return await initPersonalize(initOptions);
  } catch (error) {
    console.error('Failed to initialize Personalize with user:', error);
    return null;
  }
};

export const refreshPersonalizeForUser = async (userId: string, userEmail: string | null = null): Promise<any> => {
  personalizeInitialized = false;
  personalizeSdk = null;
  return await initPersonalizeWithUser(userId, userEmail);
};

export default {
  init: initPersonalize,
  initWithUser: initPersonalizeWithUser,
  refreshForUser: refreshPersonalizeForUser,
  getInstance: getPersonalize,
  getExperiences,
  getVariantAliases,
  triggerEvent,
  setUserAttributes
};

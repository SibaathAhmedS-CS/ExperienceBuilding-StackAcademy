/**
 * Contentstack Live Preview Utility
 * 
 * This module handles Live Preview initialization and provides utilities
 * to check if preview mode is active and get preview parameters.
 * 
 * Flow:
 * 1. Checks if Live Preview is enabled (via query params or env variable)
 * 2. Initializes Contentstack Live Preview SDK with preview token
 * 3. Sets up real-time content updates from Contentstack
 * 4. Provides utilities to check preview status
 */

import ContentstackLivePreview from '@contentstack/live-preview-utils';
import Contentstack from 'contentstack';

let livePreviewInitialized = false;

/**
 * Check if Live Preview mode is active
 * Can be activated via:
 * - URL query parameter: ?live_preview=true
 * - Environment variable: NEXT_PUBLIC_ENABLE_LIVE_PREVIEW=true
 */
export function isLivePreviewActive(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check env variable only
    return process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true';
  }
  
  // Client-side: check both URL params and env variable
  const urlParams = new URLSearchParams(window.location.search);
  const hasPreviewParam = urlParams.get('live_preview') === 'true';
  const hasEnvFlag = process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true';
  
  return hasPreviewParam || hasEnvFlag;
}

/**
 * Get Live Preview query parameters from URL
 * Returns preview-related params if present, including the tracker hash
 */
export function getLivePreviewParams(): {
  live_preview?: string;
  content_type_uid?: string;
  entry_uid?: string;
  hash?: string;
} {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    live_preview: params.get('live_preview') || undefined,
    content_type_uid: params.get('content_type_uid') || undefined,
    entry_uid: params.get('entry_uid') || undefined,
    hash: params.get('hash') || params.get('live_preview_hash') || undefined,
  };
}

/**
 * Initialize Contentstack Live Preview
 * 
 * This function:
 * 1. Checks if preview mode should be active
 * 2. Validates preview token is available
 * 3. Creates a preview Stack instance with preview token
 * 4. Initializes the Live Preview SDK
 * 5. Sets up real-time content synchronization
 * 
 * Should be called once in the app root (layout.tsx)
 */
export async function initializeLivePreview(): Promise<void> {
  // Prevent multiple initializations
  if (livePreviewInitialized) {
    console.log('[Live Preview] Already initialized, skipping...');
    return;
  }

  // Check if preview mode is active
  if (!isLivePreviewActive()) {
    console.log('[Live Preview] Preview mode not active. To enable, add ?live_preview=true to URL or set NEXT_PUBLIC_ENABLE_LIVE_PREVIEW=true');
    return;
  }

  // Get tracker hash from URL early to check if it's present
  const previewParams = getLivePreviewParams();
  const trackerHash = previewParams.hash;
  
  // Warn if no hash is present - Live Preview requires a valid hash from Contentstack
  if (!trackerHash) {
    console.warn('[Live Preview] ⚠️ No tracker hash found in URL');
    console.warn('[Live Preview] ⚠️ Live Preview requires a valid hash from Contentstack\'s preview URL');
    console.warn('[Live Preview] 💡 To use Live Preview:');
    console.warn('[Live Preview]    1. Open Contentstack CMS');
    console.warn('[Live Preview]    2. Click "Preview" on any entry');
    console.warn('[Live Preview]    3. Use the generated preview URL (it includes ?hash=...)');
    console.warn('[Live Preview] ⚠️ Continuing without hash may cause errors...');
  }

  // Get preview configuration from environment
  const previewToken = process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN || 
                       process.env.CONTENTSTACK_PREVIEW_TOKEN;
  const previewHost = process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_HOST || 
                      process.env.CONTENTSTACK_PREVIEW_HOST || 
                      'rest-preview.contentstack.com';
  const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || 
                 process.env.CONTENTSTACK_API_KEY || '';
  const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || 
                      process.env.CONTENTSTACK_ENVIRONMENT || 'dev';
  const branch = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || 
                 process.env.CONTENTSTACK_BRANCH || 'main';

  // Validate required configuration
  if (!previewToken) {
    console.warn('[Live Preview] ⚠️ Preview token not found. Live Preview disabled.');
    console.warn('[Live Preview] Set CONTENTSTACK_PREVIEW_TOKEN or NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN in your .env.local');
    return;
  }

  if (!apiKey) {
    console.warn('[Live Preview] ⚠️ API key not found. Live Preview disabled.');
    return;
  }

  try {
    console.log('[Live Preview] 🚀 Initializing Live Preview...');
    console.log('[Live Preview] Configuration:', {
      previewHost,
      environment,
      branch,
      hasPreviewToken: !!previewToken,
    });

    // Import the stack from contentstack.ts which already has live_preview config
    // This matches the reference implementation pattern - use the shared stack
    const { defaultStack } = await import('./contentstack');
    const stackForPreview = defaultStack;

    // Initialize Live Preview SDK
    // The SDK will intercept Contentstack API calls and modify them for preview mode
    console.log('[Live Preview] 📦 Initializing SDK with config...');
    if (trackerHash) {
      console.log('[Live Preview] 🔑 Tracker hash found in URL:', trackerHash.substring(0, 20) + '...');
    }
    
    // Match reference implementation pattern
    // Note: For contentstack package (not @contentstack/delivery-sdk), we pass the stack instance directly
    const initConfig: any = {
      ssr: false, // Disabling server-side rendering for live preview
      enable: process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true' || 
              process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true', // Enabling live preview if specified
      mode: 'builder', // Setting the mode to "builder" for visual builder (matches reference)
      stackSdk: stackForPreview as any, // Pass stack instance directly (contentstack package structure differs from delivery-sdk)
      stackDetails: {
        apiKey: apiKey, // Setting the API key from environment variables
        environment: environment, // Setting the environment from environment variables
      },
      clientUrlParams: {
        // Setting the client URL parameters for live preview
        host: previewHost,
      },
      editButton: {
        enable: true, // Enabling the edit button for live preview
        exclude: ['outsideLivePreviewPortal'], // Excluding the edit button from the live preview portal (matches reference)
      },
    };
    
    // Add tracker hash if present in URL
    // This is required for Live Preview to work correctly
    if (trackerHash) {
      initConfig.clientUrlParams.hash = trackerHash;
      console.log('[Live Preview] ✅ Tracker hash added to SDK config');
    }
    
    const initResult = await ContentstackLivePreview.init(initConfig);

    livePreviewInitialized = true;
    console.log('[Live Preview] ✅ SDK initialized successfully');
    console.log('[Live Preview] 📦 Init result:', initResult);
    
    // Verify SDK is actually initialized
    try {
      // Check if SDK has config property (indicates initialization)
      const config = (ContentstackLivePreview as any).config;
      const hash = (ContentstackLivePreview as any).hash;
      const isInitialized = !!config || livePreviewInitialized;
      
      console.log('[Live Preview] 🔍 SDK Status:', {
        isInitialized,
        hasConfig: !!config,
        hash: hash || 'not set',
      });
      
      if (!isInitialized) {
        console.warn('[Live Preview] ⚠️ SDK may not be fully initialized');
      }
    } catch (checkError) {
      console.warn('[Live Preview] ⚠️ Could not verify SDK status:', checkError);
    }
    
    console.log('[Live Preview] 📡 Listening for real-time content updates...');
    
    // Log preview params if present (reuse previewParams from above)
    if (previewParams.entry_uid || previewParams.content_type_uid || previewParams.hash) {
      console.log('[Live Preview] Preview params:', previewParams);
    }
    
    // Log the tracker hash from SDK
    try {
      const hash = (ContentstackLivePreview as any).hash;
      if (hash) {
        console.log('[Live Preview] ✅ Tracker hash from SDK:', hash);
      } else {
        console.warn('[Live Preview] ⚠️ Tracker hash not available from SDK');
      }
    } catch (e) {
      console.warn('[Live Preview] ⚠️ Could not get tracker hash:', e);
    }
    
    // Set up entry change listener for debugging
    try {
      ContentstackLivePreview.onEntryChange?.((data) => {
        console.log('[Live Preview] 🔄 Entry changed:', data);
      });
      console.log('[Live Preview] ✅ Entry change listener registered');
    } catch (listenerError) {
      console.warn('[Live Preview] ⚠️ Could not register entry change listener:', listenerError);
    }
  } catch (error) {
    console.error('[Live Preview] ❌ Initialization failed:', error);
    livePreviewInitialized = false;
  }
}

/**
 * Get the appropriate Stack instance based on preview mode
 * Returns preview Stack if preview is active, otherwise returns default Stack
 * 
 * This is used in contentstack.ts to switch between delivery and preview APIs
 */
export function getStackInstance(defaultStack: any): any {
  if (!isLivePreviewActive()) {
    return defaultStack;
  }

  const previewToken = process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN || 
                       process.env.CONTENTSTACK_PREVIEW_TOKEN;
  const previewHost = process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_HOST || 
                      process.env.CONTENTSTACK_PREVIEW_HOST || 
                      'rest-preview.contentstack.com';
  const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || 
                 process.env.CONTENTSTACK_API_KEY || '';
  const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || 
                      process.env.CONTENTSTACK_ENVIRONMENT || 'dev';
  const branch = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || 
                 process.env.CONTENTSTACK_BRANCH || 'main';

  if (!previewToken || !apiKey) {
    return defaultStack;
  }

  // Return preview Stack instance
  return Contentstack.Stack({
    api_key: apiKey,
    delivery_token: previewToken,
    environment: environment,
    branch: branch,
    live_preview: {
      enable: true,
      preview_token: previewToken,
      host: previewHost,
    },
  });
}

/**
 * Verify Live Preview SDK is properly initialized
 * Returns true if SDK is active and ready
 */
export function isLivePreviewSDKReady(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if SDK is initialized by checking for config property
    const config = (ContentstackLivePreview as any).config;
    if (config && (config as any).enable) {
      return true;
    }
    
    // Fallback to our internal flag
    return livePreviewInitialized;
  } catch (error) {
    console.warn('[Live Preview] Error checking SDK status:', error);
    return livePreviewInitialized;
  }
}


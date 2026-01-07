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
 * Returns preview-related params if present
 */
export function getLivePreviewParams(): {
  live_preview?: string;
  content_type_uid?: string;
  entry_uid?: string;
} {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    live_preview: params.get('live_preview') || undefined,
    content_type_uid: params.get('content_type_uid') || undefined,
    entry_uid: params.get('entry_uid') || undefined,
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

    // Create Stack instance with Live Preview configuration
    // According to Contentstack docs: Use delivery_token, but configure live_preview with preview_token
    // The SDK will handle switching to preview API internally
    const deliveryToken = process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || 
                          process.env.CONTENTSTACK_DELIVERY_TOKEN || '';
    
    if (!deliveryToken) {
      console.warn('[Live Preview] ⚠️ Delivery token not found. Live Preview disabled.');
      return;
    }

    // For Live Preview, use preview token as delivery_token
    // The SDK will handle the preview API calls
    const stackForPreview = Contentstack.Stack({
      api_key: apiKey,
      delivery_token: previewToken, // Use preview token as delivery token for preview mode
      environment: environment,
      branch: branch,
      live_preview: {
        enable: true,
        preview_token: previewToken,
        host: previewHost,
      },
    });

    // Initialize Live Preview SDK
    // The SDK will intercept Contentstack API calls and modify them for preview mode
    console.log('[Live Preview] 📦 Initializing SDK with config...');
    
    const initResult = await ContentstackLivePreview.init({
      stackSdk: stackForPreview,
      stackDetails: {
        apiKey: apiKey,
        environment: environment,
        branch: branch,
      },
      clientUrlParams: {
        host: previewHost,
      },
      ssr: false, // Set to false for client-side only (Next.js App Router)
      enable: true, // Explicitly enable Live Preview
      // Enable edit buttons to appear on content elements
      editButton: {
        enable: true, // Enable edit buttons
        position: 'top-right', // Position of edit buttons
        includeByQueryParameter: true, // Show buttons when ?live_preview=true is in URL
      },
      editInVisualBuilderButton: {
        enable: true, // Enable visual builder edit button
        position: 'top-right',
      },
    });

    livePreviewInitialized = true;
    console.log('[Live Preview] ✅ SDK initialized successfully');
    console.log('[Live Preview] 📦 Init result:', initResult);
    
    // Verify SDK is actually initialized
    try {
      const isInitialized = ContentstackLivePreview.isInitialized?.() ?? false;
      const config = ContentstackLivePreview.config;
      const hash = ContentstackLivePreview.hash;
      
      console.log('[Live Preview] 🔍 SDK Status:', {
        isInitialized,
        hasConfig: !!config,
        hash: hash || 'not set',
      });
      
      if (!isInitialized) {
        console.warn('[Live Preview] ⚠️ SDK reports not initialized, but init() completed');
      }
    } catch (checkError) {
      console.warn('[Live Preview] ⚠️ Could not verify SDK status:', checkError);
    }
    
    console.log('[Live Preview] 📡 Listening for real-time content updates...');
    
    // Log preview params if present
    const previewParams = getLivePreviewParams();
    if (previewParams.entry_uid || previewParams.content_type_uid) {
      console.log('[Live Preview] Preview params:', previewParams);
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
    // Check if SDK is initialized
    if (typeof ContentstackLivePreview.isInitialized === 'function') {
      return ContentstackLivePreview.isInitialized();
    }
    
    // Check if we have the config
    const config = ContentstackLivePreview.config;
    if (config && (config as any).enable) {
      return true;
    }
    
    return livePreviewInitialized;
  } catch (error) {
    console.warn('[Live Preview] Error checking SDK status:', error);
    return livePreviewInitialized;
  }
}


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
  return false;
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
  const previewToken = process.env.CONTENTSTACK_PREVIEW_TOKEN;
  const previewHost = process.env.CONTENTSTACK_PREVIEW_HOST;
  const applicationHost = process.env.CONTENTSTACK_APP_HOST;
  const apiKey = process.env.CONTENTSTACK_API_KEY;
  const environment = process.env.CONTENTSTACK_ENVIRONMENT;
  const branch = process.env.CONTENTSTACK_BRANCH;

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

    // Match Contentstack documentation pattern for SSR
    // Reference: https://www.contentstack.com/docs/developers/set-up-live-preview/set-up-live-preview-with-rest-for-server-side-rendering
    const initConfig: any = {
      enable: process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true' || 
              process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true', // Enabling live preview if specified
      ssr: true, // Enable SSR mode for Next.js App Router (as per documentation)
      stackSdk: stackForPreview as any, // Pass stack instance directly
      // Recommended: Enables Edit Tags (as per documentation)
      // This enables the edit buttons that appear on content elements
      editButton: {
        enable: true, // Enable edit buttons
        exclude: [], // Don't exclude any elements (show edit buttons everywhere)
      },
      stackDetails: {
        apiKey: apiKey, // Setting the API key from environment variables
        environment: environment, // Setting the environment from environment variables
        branch: branch, // Setting the branch from environment variables
      },
      clientUrlParams: {
        protocol: 'https', // As per documentation
        host: applicationHost, // Contentstack application host (app.contentstack.com), not preview API host
        port: 443, // As per documentation
      },
    };


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


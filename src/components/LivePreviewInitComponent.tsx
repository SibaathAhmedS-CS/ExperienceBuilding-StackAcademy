'use client';

/**
 * Live Preview Initialization Component
 * 
 * This component initializes the Contentstack Live Preview SDK on the client side.
 * According to Contentstack documentation, this should be a separate client component
 * to avoid configuration reset errors due to re-rendering.
 * 
 * Reference: https://www.contentstack.com/docs/developers/set-up-live-preview/live-preview-implementation-for-nextjs-ssr-app-router
 */

import { useEffect } from 'react';
import ContentstackLivePreview from '@contentstack/live-preview-utils';
import { defaultStack } from '@/lib/contentstack';

export default function LivePreviewInitComponent() {
  useEffect(() => {
    // Check if Live Preview should be enabled
    // According to docs, edit tags should work even without hash
    // Hash is only needed for preview mode, not for edit buttons
    const urlParams = new URLSearchParams(window.location.search);
    const hasPreviewParam = urlParams.get('live_preview') === 'true' || !!urlParams.get('hash');
    const hasEnvFlag = process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true';
    const hasEditTagsFlag = process.env.CONTENTSTACK_LIVE_EDIT_TAGS === 'true';
    
    // Initialize if any of these conditions are met
    if (!hasPreviewParam && !hasEnvFlag && !hasEditTagsFlag) {
      return; // Don't initialize if Live Preview is not active
    }

    const previewToken = process.env.CONTENTSTACK_PREVIEW_TOKEN;
    const previewHost = process.env.CONTENTSTACK_PREVIEW_HOST;
    const applicationHost = process.env.CONTENTSTACK_APP_HOST;
    const apiKey = process.env.CONTENTSTACK_API_KEY;
    const environment = process.env.CONTENTSTACK_ENVIRONMENT;
    const branch = process.env.CONTENTSTACK_BRANCH;

    if (!previewToken || !apiKey) {
      return;
    }

    const hash = urlParams.get('hash') || urlParams.get('live_preview_hash');

    try {
      
      const initConfig: any = {
        enable: true,
        ssr: true, // Enable SSR mode for Next.js App Router (as per documentation)
        stackSdk: defaultStack, // Pass stack instance directly
        // CRITICAL: Edit Tags must be enabled for edit buttons to appear
        // Reference: https://www.contentstack.com/docs/developers/set-up-live-preview/live-preview-implementation-for-nextjs-ssr-app-router
        editButton: {
          enable: true,
        },
        stackDetails: {
          apiKey: apiKey,
          environment: environment,
          branch: branch,
        },
        clientUrlParams: {
          protocol: 'https',
          host: applicationHost, // Contentstack application host (app.contentstack.com)
          port: 443,
        },
      };

      // Add tracker hash if present in URL
      if (hash) {
        initConfig.clientUrlParams.hash = hash;
      }

      const initResult = ContentstackLivePreview.init(initConfig);
      
      
      // Verify SDK is initialized
      try {
        const config = (ContentstackLivePreview as any).config;
        if (config) {
        } else {
        }
      } catch (checkError) {
      }
    } catch (error) {
      console.error('[Live Preview] ❌ Initialization failed:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
}


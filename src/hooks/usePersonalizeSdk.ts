// hooks/usePersonalizeSdk.ts
'use client';

import { useState, useEffect } from 'react';
import Personalize from '@contentstack/personalize-edge-sdk';

/**
 * Hook to get Personalize SDK instance on client side
 * Similar to how destination tracking works in the friend's project
 */
export function usePersonalizeSdk() {
  const [sdk, setSdk] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initSdk = async () => {
      try {
        const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
        
        if (!projectUid) {
          console.warn('[Personalize SDK] Project UID not configured');
          return;
        }

        // Set custom edge API URL if provided
        if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
          Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
        }

        // Create a Request object from the current window location
        // The SDK needs a Request object to read cookies and headers
        const personalizeRequest = new Request(window.location.href, {
          method: 'GET',
          headers: new Headers(),
        });

        // Initialize Personalize SDK
        const personalizeSdk = await Personalize.init(projectUid, {
          request: personalizeRequest,
        });

        setSdk(personalizeSdk);
        setIsReady(true);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Personalize SDK] ✅ Initialized successfully');
        }
      } catch (error) {
        console.error('[Personalize SDK] ❌ Initialization error:', error);
        setIsReady(false);
      }
    };

    initSdk();
  }, []);

  return { sdk, isReady };
}


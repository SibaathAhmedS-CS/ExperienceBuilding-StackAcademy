'use client';

import { useState, useEffect } from 'react';
import Personalize from '@contentstack/personalize-edge-sdk';

const PERSONALIZE_PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || '';

/**
 * Simplified Personalize hook
 * Initializes SDK and provides variant parameter
 */
export function usePersonalize() {
  const [personalizeSdk, setPersonalizeSdk] = useState<any>(null);
  const [variantParam, setVariantParam] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!PERSONALIZE_PROJECT_UID) {
      console.warn('[Personalize] No Project UID configured');
      setIsReady(true);
      return;
    }

    const initPersonalize = async () => {
      try {
        // Check if variant is already set by middleware (from URL query param)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const middlewareVariant = urlParams.get('cs_personalize_variant') || 
                                   urlParams.get('cs_personalize_variant_uid');
          
          if (middlewareVariant) {
            console.log('[Personalize] ✅ Variant from middleware:', middlewareVariant);
            setVariantParam(middlewareVariant);
            setIsReady(true);
            return;
          }
        }

        // Initialize SDK
        const sdk = await Personalize.init(PERSONALIZE_PROJECT_UID, {
          edgeMode: true,
        } as any);

        setPersonalizeSdk(sdk);
        
        // Get variant parameter
        const variant = sdk.getVariantParam();
        if (variant) {
          setVariantParam(variant);
        }
        
        setIsReady(true);
        console.log('[Personalize] ✅ SDK initialized');
      } catch (error) {
        console.error('[Personalize] ❌ Error initializing:', error);
        setIsReady(true); // Set ready anyway to not block app
      }
    };

    initPersonalize();
  }, []);

  return {
    personalizeSdk,
    variantParam,
    isReady,
  };
}

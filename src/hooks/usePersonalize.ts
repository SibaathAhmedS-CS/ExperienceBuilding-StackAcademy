'use client';

import { useState, useEffect, useCallback } from 'react';
import Personalize from '@contentstack/personalize-edge-sdk';
import { setPersonalizeVariant } from '@/lib/contentstack';
import { onLyticsReady, isLyticsReady, getAudiencesFromLocalStorage, storeAudiencesInLocalStorage } from '@/lib/lytics';
import { createClient } from '@/utils/supabase/client';

/**
 * Contentstack Personalize + Lytics Integration (Option 3)
 * 
 * Flow:
 * 1. LyticsProvider sends user data to Lytics (goal, role, education, etc.)
 * 2. Lytics evaluates user against audience rules and stores membership
 * 3. Personalize SDK reads Lytics cookie/data automatically (when integration is configured)
 * 4. Personalize SDK returns the correct variant based on Lytics audience
 * 
 * This removes the need for local if-condition logic - Lytics is the 
 * single source of truth for audience determination.
 */

// Personalize Project UID from Contentstack
const PERSONALIZE_PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || '';

interface PersonalizeState {
  isInitialized: boolean;
  isLoading: boolean;
  variantParam: string;      // The x-cs-variant-uid parameter value (e.g., 'cs_personalize_0_2')
  audiences: string[];       // Audiences determined by Lytics
  variantAlias: string | null;
  error: Error | null;
}

/**
 * Hook to manage Contentstack Personalize with Lytics Integration
 * 
 * The Personalize SDK automatically integrates with Lytics when:
 * 1. Lytics is configured in Contentstack Personalize dashboard
 * 2. Lytics JavaScript tag is loaded on the page
 * 3. User has been identified to Lytics
 * 
 * The SDK reads the Lytics cookie and determines audience membership automatically.
 */
export function usePersonalize() {
  const [state, setState] = useState<PersonalizeState>({
    isInitialized: false,
    isLoading: true,
    variantParam: '',
    audiences: [],
    variantAlias: null,
    error: null,
  });

  /**
   * Wait for Lytics to be ready
   * Returns a promise that resolves when Lytics jstag is loaded
   */
  const waitForLytics = useCallback((maxWait = 5000): Promise<void> => {
    return new Promise((resolve) => {
      // If already ready, resolve immediately
      if (isLyticsReady()) {
        resolve();
        return;
      }
      
      // Use the onLyticsReady utility with a timeout
      const timeoutId = setTimeout(() => {
        console.warn('[Personalize] ⏰ Lytics timeout - continuing without Lytics');
        resolve(); // Resolve anyway to not block personalization
      }, maxWait);
      
      onLyticsReady(() => {
        clearTimeout(timeoutId);
        resolve();
      }, maxWait);
    });
  }, []);

  /**
   * Get audiences from Lytics using jstag.getSegments()
   * This is the Lytics-driven approach - audiences come from Lytics, not local logic
   * Reference: https://docs.lytics.com/docs/lytics-javascript-tag#installation
   * 
   * According to Lytics docs, jstag.getSegments() returns a list of audiences 
   * the user is a member of and should only be called after the user profile has loaded.
   * 
   * This function checks localStorage first, then fetches from Lytics if needed.
   */
  const getAudiencesFromLytics = useCallback(async (): Promise<string[]> => {
    // First, try to get user identifier
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userIdentifier = user?.id || user?.email || 'anonymous';
    
    // Check localStorage first (fast, cached)
    const cachedAudiences = getAudiencesFromLocalStorage(userIdentifier);
    if (cachedAudiences && cachedAudiences.length > 0) {
      console.log('[Personalize] 📦 Using cached audiences from localStorage:', cachedAudiences);
      return cachedAudiences;
    }
    
    // If not in cache, fetch from Lytics
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.jstag) {
        console.log('[Personalize] Lytics jstag not available');
        resolve([]);
        return;
      }

      // First try jstag.getSegments() - recommended method per Lytics docs
      if (typeof window.jstag.getSegments === 'function') {
        window.jstag.getSegments((segments: string[]) => {
          const audiences = Array.isArray(segments) ? segments : [];
          console.log('[Personalize] 📊 Audiences from jstag.getSegments():', audiences);
          
          // Store in localStorage for future use
          if (audiences.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiences);
          }
          
          resolve(audiences);
        });
        return;
      }

      // Fallback to jstag.getEntity() if getSegments() is not available
      if (typeof (window.jstag as any).getEntity === 'function') {
        (window.jstag as any).getEntity((error: any, entity: any) => {
          if (error) {
            console.warn('[Personalize] Error getting entity from Lytics:', error);
            resolve([]);
            return;
          }

          // Extract audiences from Lytics entity
          const audiences = entity?.data?.audiences || 
                          entity?.data?.segments || 
                          entity?.audiences || 
                          [];
          const audiencesArray = Array.isArray(audiences) ? audiences : [];
          
          console.log('[Personalize] 📊 Audiences from jstag.getEntity():', audiencesArray);
          
          // Store in localStorage for future use
          if (audiencesArray.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiencesArray);
          }
          
          resolve(audiencesArray);
        });
      } else {
        console.warn('[Personalize] Neither jstag.getSegments() nor jstag.getEntity() is available');
        resolve([]);
      }
    });
  }, []);

  // Initialize Personalize SDK after Lytics is ready
  useEffect(() => {
    let isMounted = true;

    const initPersonalize = async () => {
      try {
        console.log('[Personalize] 🚀 Starting initialization...');
        
        // Step 1: Wait for Lytics to be ready
        // This ensures the Lytics cookie is set with user data
        await waitForLytics();
        
        if (!isMounted) return;
        
        console.log('[Personalize] ✅ Lytics is ready');
        
        // Small delay to ensure Lytics has processed any pending identify calls
        // and the user profile has loaded (required for getSegments())
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;

        // Step 2: Check if Personalize Project UID is configured
        if (!PERSONALIZE_PROJECT_UID) {
          console.warn('[Personalize] ⚠️ No Project UID configured. Set NEXT_PUBLIC_PERSONALIZE_PROJECT_UID');
          setState(prev => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            error: new Error('Personalize Project UID not configured'),
          }));
          return;
        }

        // Step 3: Get audiences from Lytics
        // Even with Lytics integration, we need to explicitly get audiences and set them
        const lyticsAudiences = await getAudiencesFromLytics();
        console.log('[Personalize] 🎯 Audiences from Lytics:', lyticsAudiences);

        // Step 4: Initialize Personalize SDK
        console.log('[Personalize] 📦 Initializing SDK with Project:', PERSONALIZE_PROJECT_UID.substring(0, 8) + '...');
        
        // Initialize the SDK
        const personalizeInstance = (Personalize as any).init(PERSONALIZE_PROJECT_UID, {
          edgeMode: true,  // Uses edge-based personalization for faster response
        });

        // Step 5: Set audiences on Personalize SDK (from Lytics)
        // The SDK needs audiences to be set explicitly, even with Lytics integration
        if (lyticsAudiences.length > 0) {
          (Personalize as any).setAudiences(lyticsAudiences);
          console.log('[Personalize] ✅ Set audiences on SDK:', lyticsAudiences);
        }

        // Step 6: Get personalization data from SDK
        // Check if get() exists and is a function before calling
        let personalizeData: any = null;
        
        if (typeof (Personalize as any).get === 'function') {
          personalizeData = (Personalize as any).get();
        } else if (personalizeInstance && typeof personalizeInstance.get === 'function') {
          // If init() returns an instance, try calling get() on it
          personalizeData = personalizeInstance.get();
        } else {
          console.warn('[Personalize] ⚠️ Personalize.get() is not available. SDK may not be initialized correctly.');
          throw new Error('Personalize SDK get() method is not available');
        }

        console.log('[Personalize] 🎭 SDK Response:', {
          variantParam: personalizeData?.variantParam || 'base (no variant)',
          audiences: personalizeData?.audiences || [],
          experienceUid: personalizeData?.experienceUid || 'none',
          variantAlias: personalizeData?.variantAlias || 'base',
        });

        const variantParam = personalizeData?.variantParam || '';
        const audiences = personalizeData?.audiences || [];
        const variantAlias = personalizeData?.variantAlias || null;

        // Step 5: Store variant for global access in content fetching
        if (variantParam) {
          setPersonalizeVariant(variantParam);
          console.log('[Personalize] 💾 Variant stored:', variantParam);
        }

        if (!isMounted) return;

        setState({
          isInitialized: true,
          isLoading: false,
          variantParam,
          audiences,
          variantAlias,
          error: null,
        });

        console.log('[Personalize] ✅ Initialization complete!', {
          variant: variantParam || 'base',
          audiences: audiences.length > 0 ? audiences : ['(no audiences matched)'],
        });

      } catch (error) {
        console.error('[Personalize] ❌ Initialization error:', error);
        
        if (!isMounted) return;
        
        setState({
          isInitialized: true,
          isLoading: false,
          variantParam: '',
          audiences: [],
          variantAlias: null,
          error: error instanceof Error ? error : new Error('Failed to initialize Personalize'),
        });
      }
    };

    initPersonalize();

    return () => {
      isMounted = false;
    };
  }, [waitForLytics]);

  // Get variant parameters for API calls
  const getVariantParams = useCallback(() => {
    if (!state.variantParam) return {};
    
    return {
      'x-cs-variant-uid': state.variantParam,
    };
  }, [state.variantParam]);

  // Refresh personalization (e.g., after user preferences change)
  const refresh = useCallback(async () => {
    console.log('[Personalize] 🔄 Refreshing...');
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Wait for Lytics to be ready again
      await waitForLytics();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get fresh audiences from Lytics
      const lyticsAudiences = await getAudiencesFromLytics();
      
      // Re-initialize to get fresh data
      const personalizeInstance = (Personalize as any).init(PERSONALIZE_PROJECT_UID, {
        edgeMode: true,
      });
      
      // Set audiences
      if (lyticsAudiences.length > 0) {
        (Personalize as any).setAudiences(lyticsAudiences);
      }
      
      // Get personalization data
      let personalizeData: any = null;
      if (typeof (Personalize as any).get === 'function') {
        personalizeData = (Personalize as any).get();
      } else if (personalizeInstance && typeof personalizeInstance.get === 'function') {
        personalizeData = personalizeInstance.get();
      } else {
        throw new Error('Personalize SDK get() method is not available');
      }
      
      const variantParam = personalizeData?.variantParam || '';
      const audiences = personalizeData?.audiences || [];
      const variantAlias = personalizeData?.variantAlias || null;
      
      if (variantParam) {
        setPersonalizeVariant(variantParam);
      }
      
      setState({
        isInitialized: true,
        isLoading: false,
        variantParam,
        audiences,
        variantAlias,
        error: null,
      });
      
      console.log('[Personalize] ✅ Refresh complete:', { variantParam, audiences });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Refresh failed'),
      }));
    }
  }, [waitForLytics, getAudiencesFromLytics]);

  return {
    ...state,
    getVariantParams,
    refresh,
    // For backwards compatibility, expose audienceName (first audience)
    audienceName: state.audiences.length > 0 ? state.audiences[0] : null,
  };
}

/**
 * Get the current variant alias (can be used in non-hook contexts)
 */
export function getStoredVariantAlias(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('personalize_variant_alias');
  } catch {
    return null;
  }
}

/**
 * Store variant alias for persistence
 */
export function storeVariantAlias(alias: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (alias) {
      localStorage.setItem('personalize_variant_alias', alias);
    } else {
      localStorage.removeItem('personalize_variant_alias');
    }
  } catch {
    // Ignore storage errors
  }
}


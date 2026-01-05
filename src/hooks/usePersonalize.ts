'use client';

import { useState, useEffect, useCallback } from 'react';
import Personalize from '@contentstack/personalize-edge-sdk';
import { setPersonalizeVariant } from '@/lib/contentstack';
import { onLyticsReady, isLyticsReady } from '@/lib/lytics';
import { checkPersonalizeConfig } from '@/lib/checkPersonalizeConfig';

/**
 * Contentstack Personalize + Lytics Integration (Option 3)
 * 
 * This is the recommended approach where Lytics and Contentstack Personalize 
 * are connected at the platform level, allowing automatic audience resolution.
 * 
 * Flow:
 * 1. LyticsProvider sends user data to Lytics (goal, role, education, etc.)
 * 2. Lytics evaluates user against audience rules and stores membership in cookie
 * 3. Personalize SDK reads Lytics cookie automatically (when integration is configured)
 * 4. Personalize SDK queries Lytics-Contentstack integration for audience memberships
 * 5. Personalize SDK maps Lytics audiences to Personalize audiences and returns variant
 * 
 * Key Point: When Lytics integration is configured in Contentstack Personalize dashboard,
 * the SDK handles ALL audience determination automatically. No manual audience setting needed!
 */

// Personalize Project UID from Contentstack
const PERSONALIZE_PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || '';

interface PersonalizeState {
  isInitialized: boolean;
  isLoading: boolean;
  variantParam: string;      // The x-cs-variant-uid parameter value (e.g., 'cs_personalize_0_2')
  audiences: string[];       // Audiences determined by Lytics (via SDK)
  variantAlias: string | null;
  error: Error | null;
}

/**
 * Hook to manage Contentstack Personalize with Lytics Integration
 * 
 * The Personalize SDK automatically integrates with Lytics when:
 * 1. Lytics is configured in Contentstack Personalize dashboard (Settings → Integrations)
 * 2. Lytics JavaScript tag is loaded on the page
 * 3. User has been identified to Lytics (via LyticsProvider)
 * 
 * The SDK automatically:
 * - Reads the Lytics cookie (seerid or _uid)
 * - Queries the Lytics-Contentstack integration for audience memberships
 * - Maps Lytics audiences to Personalize audiences
 * - Returns the correct variant parameter
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

  // Initialize Personalize SDK after Lytics is ready
  useEffect(() => {
    let isMounted = true;

    const initPersonalize = async () => {
      try {
        console.log('[Personalize] 🚀 Starting initialization...');
        
        // Check if variant is already set by middleware (from URL query param)
        // Middleware sets variant in URL as: ?cs_personalize_variant=cs_personalize_0_2
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const middlewareVariant = urlParams.get('cs_personalize_variant') || 
                                   urlParams.get('cs_personalize_variant_uid');
          
          if (middlewareVariant) {
            console.log('[Personalize] ✅ Variant from middleware (URL):', middlewareVariant);
            setPersonalizeVariant(middlewareVariant);
            setState({
              isInitialized: true,
              isLoading: false,
              variantParam: middlewareVariant,
              audiences: [], // Middleware doesn't provide audiences, but variant is set
              variantAlias: null,
              error: null,
            });
            return; // Skip SDK initialization if middleware already set variant
          }
        }
        
        // Step 1: Wait for Lytics to be ready
        // This ensures the Lytics cookie is set with user data
        await waitForLytics();
        
        if (!isMounted) return;
        
        console.log('[Personalize] ✅ Lytics is ready');
        
        // Wait longer for Lytics to process identify call and evaluate segments
        // Lytics needs time to:
        // 1. Process the identify() call
        // 2. Evaluate audience rules against user data
        // 3. Update user profile with segment memberships
        // 4. Set the segments cookie (seerid cookie contains segment data)
        // This can take 2-5 seconds, so we wait 5 seconds to be safe
        console.log('[Personalize] ⏳ Waiting for Lytics to evaluate segments (5 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if segments cookie has been updated and try to get segments from Lytics
        if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.jstag) {
          const cookies = document.cookie.split(';');
          const seeridCookie = cookies.find(c => c.trim().startsWith('seerid='));
          const segmentsCookie = cookies.find(c => c.trim().startsWith('lytics_segments='));
          
          if (segmentsCookie) {
            const segmentsValue = decodeURIComponent(segmentsCookie.split('=')[1]);
            console.log('[Personalize] 🔍 Current lytics_segments cookie:', segmentsValue);
            
            // Try to parse JSON if it's JSON
            try {
              const parsed = JSON.parse(segmentsValue);
              console.log('[Personalize] 🔍 Parsed segments:', parsed);
            } catch {
              console.log('[Personalize] 🔍 Segments cookie is not JSON');
            }
          }
          
          if (seeridCookie) {
            const seeridValue = seeridCookie.split('=')[1];
            console.log('[Personalize] 🔍 seerid cookie exists (Lytics user ID):', seeridValue.substring(0, 20) + '...');
          }
          
          // Try to get segments directly from Lytics jstag
          if (typeof window.jstag.getSegments === 'function') {
            window.jstag.getSegments((segments: string[]) => {
              console.log('[Personalize] 🔍 Segments from jstag.getSegments():', segments);
              if (segments && segments.length > 0 && !(segments.length === 1 && segments[0] === 'all')) {
                console.log('[Personalize] ✅ Real segments found:', segments);
              } else {
                console.warn('[Personalize] ⚠️ Segments still ["all"] or empty. Lytics may not have evaluated user yet.');
                console.warn('[Personalize] 💡 This could mean:');
                console.warn('  1. Audience rules in Lytics dashboard don\'t match user attributes');
                console.warn('  2. Lytics needs more time to process (check Lytics dashboard)');
                console.warn('  3. User attributes sent to Lytics:', {
                  goal: 'explore-for-fun',
                  role: 'ux-designer',
                  daily_goal_minutes: 60
                });
              }
            });
          }
        }
        
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

        // Step 3: Initialize Personalize SDK
        // When Lytics integration is configured, the SDK automatically:
        // - Reads the Lytics cookie from the browser
        // - Extracts the user's Lytics ID
        // - Queries the Lytics-Contentstack integration for audience memberships
        // - Maps Lytics audiences to Personalize audiences
        console.log('[Personalize] 📦 Initializing SDK with Project:', PERSONALIZE_PROJECT_UID.substring(0, 8) + '...');
        
        // Debug: Check Personalize object before init
        const personalizeObj = Personalize as any;
        console.log('[Personalize] 🔍 Personalize object before init:', {
          hasInit: typeof personalizeObj.init === 'function',
          hasGet: typeof personalizeObj.get === 'function',
          hasGetExperiences: typeof personalizeObj.getExperiences === 'function',
          hasGetVariant: typeof personalizeObj.getVariant === 'function',
          personalizeKeys: Object.keys(personalizeObj),
          allMethods: Object.keys(personalizeObj).filter(key => typeof personalizeObj[key] === 'function'),
        });
        
        // Initialize the SDK
        // In v1.0.9+, init() returns a promise that resolves to an SDK instance
        // We must use the instance methods, not global functions
        // Reference: https://www.contentstack.com/docs/developers/sdks/personalize-edge-sdk/javascript/javascript-personalize-edge-v109-migration-guide
        console.log('[Personalize] 📦 Calling init() to get SDK instance...');
        const personalizeSdk = await personalizeObj.init(PERSONALIZE_PROJECT_UID, {
          edgeMode: true,  // Uses edge-based personalization for faster response
        } as any);

        console.log('[Personalize] ✅ SDK instance created');

        // Debug: Check SDK instance methods
        const sdkMethods = Object.keys(personalizeSdk).filter(key => typeof personalizeSdk[key] === 'function');
        console.log('[Personalize] 🔍 SDK instance methods:', {
          hasGetExperiences: typeof personalizeSdk.getExperiences === 'function',
          hasGetVariants: typeof personalizeSdk.getVariants === 'function',
          hasGetActiveVariant: typeof personalizeSdk.getActiveVariant === 'function',
          hasGetVariantParam: typeof personalizeSdk.getVariantParam === 'function',
          allMethods: sdkMethods,
        });

        // Step 4: Get personalization data from SDK instance
        // Try getVariants() first (returns all active variants)
        // Then try getActiveVariant() (returns the primary variant)
        // Finally try getExperiences() (returns experiences array)
        let personalizeData: any = null;
        
        try {
          // Try getVariants() - returns array of active variants
          if (typeof personalizeSdk.getVariants === 'function') {
            const variants = personalizeSdk.getVariants();
            console.log('[Personalize] 📊 getVariants() returned:', variants);
            console.log('[Personalize] 📊 getVariants() type:', typeof variants, 'isArray:', Array.isArray(variants));
            
            // Handle different return types
            if (Array.isArray(variants) && variants.length > 0) {
              // Filter out null values
              const validVariants = variants.filter(v => v !== null && v !== undefined);
              if (validVariants.length > 0) {
                const primaryVariant = validVariants[0];
                console.log('[Personalize] 📊 Primary variant object:', JSON.stringify(primaryVariant, null, 2));
                personalizeData = {
                  variantParam: primaryVariant.variantParam || primaryVariant.variant_uid || primaryVariant.variantParam || '',
                  audiences: primaryVariant.audiences || primaryVariant.audience || [],
                  experienceUid: primaryVariant.experienceUid || primaryVariant.experience_uid || '',
                  variantAlias: primaryVariant.variantAlias || primaryVariant.alias || null,
                };
                console.log('[Personalize] ✅ Extracted variant from getVariants():', personalizeData);
              }
            } else if (variants && typeof variants === 'object' && !Array.isArray(variants)) {
              // Handle object with numeric keys like {0: null, 1: {...}}
              const variantKeys = Object.keys(variants).filter(key => variants[key] !== null);
              if (variantKeys.length > 0) {
                const firstKey = variantKeys[0];
                const primaryVariant = variants[firstKey];
                console.log('[Personalize] 📊 Primary variant from object:', JSON.stringify(primaryVariant, null, 2));
                personalizeData = {
                  variantParam: primaryVariant.variantParam || primaryVariant.variant_uid || '',
                  audiences: primaryVariant.audiences || primaryVariant.audience || [],
                  experienceUid: primaryVariant.experienceUid || primaryVariant.experience_uid || '',
                  variantAlias: primaryVariant.variantAlias || primaryVariant.alias || null,
                };
                console.log('[Personalize] ✅ Extracted variant from getVariants() object:', personalizeData);
              }
            }
          }
          
          // If getVariants didn't work, try getActiveVariant()
          if (!personalizeData && typeof personalizeSdk.getActiveVariant === 'function') {
            const activeVariant = personalizeSdk.getActiveVariant();
            console.log('[Personalize] 📊 getActiveVariant() returned:', activeVariant);
            console.log('[Personalize] 📊 getActiveVariant() type:', typeof activeVariant);
            
            if (activeVariant && typeof activeVariant === 'object') {
              console.log('[Personalize] 📊 Active variant object:', JSON.stringify(activeVariant, null, 2));
              personalizeData = {
                variantParam: activeVariant.variantParam || activeVariant.variant_uid || '',
                audiences: activeVariant.audiences || activeVariant.audience || [],
                experienceUid: activeVariant.experienceUid || activeVariant.experience_uid || '',
                variantAlias: activeVariant.variantAlias || activeVariant.alias || null,
              };
              console.log('[Personalize] ✅ Extracted variant from getActiveVariant():', personalizeData);
            }
          }
          
          // If still no data, try getExperiences()
          if (!personalizeData && typeof personalizeSdk.getExperiences === 'function') {
            const experiences = personalizeSdk.getExperiences();
            console.log('[Personalize] 📊 getExperiences() returned:', experiences);
            console.log('[Personalize] 📊 getExperiences() type:', typeof experiences, 'isArray:', Array.isArray(experiences));
            
            if (Array.isArray(experiences) && experiences.length > 0) {
              // Log full experience object to see what's available
              const firstExperience = experiences[0];
              console.log('[Personalize] 📊 First experience object:', JSON.stringify(firstExperience, null, 2));
              console.log('[Personalize] 📊 First experience keys:', Object.keys(firstExperience));
              
              // Check if activeVariantShortUid is null (means no variant matched)
              if (firstExperience.activeVariantShortUid === null || firstExperience.activeVariantShortUid === undefined) {
                console.warn('[Personalize] ⚠️ activeVariantShortUid is null - No variant matched!');
                console.warn('[Personalize] 🔍 This means:');
                console.warn('  1. Experience found (shortUid: ' + firstExperience.shortUid + ')');
                console.warn('  2. BUT no variant is active (activeVariantShortUid: null)');
                console.warn('  3. Possible reasons:');
                console.warn('     - User does not belong to any audience that has a variant');
                console.warn('     - Lytics segments are still ["all"] (not evaluated yet)');
                console.warn('     - Audience mapping in Contentstack Personalize is incorrect');
                console.warn('     - Experience variants are not configured correctly');
                
                // Try to get more info from SDK
                if (typeof personalizeSdk.getVariants === 'function') {
                  const allVariants = personalizeSdk.getVariants();
                  console.log('[Personalize] 🔍 All variants from SDK:', allVariants);
                }
                
                // Check Lytics segments directly
                if (typeof window !== 'undefined' && window.jstag && typeof window.jstag.getSegments === 'function') {
                  window.jstag.getSegments((segments: string[]) => {
                    console.log('[Personalize] 🔍 Current Lytics segments:', segments);
                    if (segments && segments.length > 0 && !(segments.length === 1 && segments[0] === 'all')) {
                      console.log('[Personalize] ✅ Real segments found, but Personalize SDK still returned null variant');
                      console.warn('[Personalize] 💡 This suggests the Lytics-Contentstack integration may not be configured correctly');
                    } else {
                      console.warn('[Personalize] ⚠️ Segments are still ["all"] - Lytics has not evaluated user yet');
                    }
                  });
                }
              }
              
              // Try to build variant UID from shortUid and activeVariantShortUid
              // Format: cs_personalize_{experienceUid}_{variantUid}
              let variantParam = '';
              if (firstExperience.activeVariantShortUid !== null && firstExperience.activeVariantShortUid !== undefined) {
                variantParam = `cs_personalize_${firstExperience.shortUid}_${firstExperience.activeVariantShortUid}`;
                console.log('[Personalize] ✅ Built variant UID from shortUids:', variantParam);
              } else {
                // No active variant - try to get default/base variant
                console.log('[Personalize] ⚠️ No active variant, using base/default');
                variantParam = ''; // Will fall back to base
              }
              
              // Try multiple possible field names for audiences
              const audiences = firstExperience.audiences || 
                               firstExperience.audience || 
                               firstExperience.segments ||
                               (Array.isArray(firstExperience.audiences) ? firstExperience.audiences : []);
              
              const experienceUid = firstExperience.experienceUid || 
                                  firstExperience.experience_uid ||
                                  firstExperience.shortUid ||
                                  '';
              
              const variantAlias = firstExperience.variantAlias || 
                                 firstExperience.alias ||
                                 firstExperience.variantAlias ||
                                 null;
              
              personalizeData = {
                variantParam,
                audiences: Array.isArray(audiences) ? audiences : [],
                experienceUid,
                variantAlias,
              };
              console.log('[Personalize] ✅ Extracted variant from getExperiences():', personalizeData);
            }
          }
          
          // Last resort: try getVariantParam() if it exists
          if (!personalizeData && typeof personalizeSdk.getVariantParam === 'function') {
            const variantParam = personalizeSdk.getVariantParam();
            if (variantParam) {
              personalizeData = {
                variantParam: variantParam,
                audiences: [],
                experienceUid: '',
                variantAlias: null,
              };
              console.log('[Personalize] ✅ Got variantParam from getVariantParam():', personalizeData);
            }
          }
          
        } catch (error) {
          console.error('[Personalize] ❌ Error getting personalization data:', error);
          throw error;
        }
        
        if (!personalizeData) {
          throw new Error(
            'Personalize SDK: Could not retrieve variant data. ' +
            'Available methods: ' + sdkMethods.join(', ') +
            '. Check Contentstack Personalize SDK documentation.'
          );
        }

        console.log('[Personalize] 🎭 SDK Response (from Lytics integration):', {
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
          note: 'Audiences determined automatically by Lytics integration',
        });

        // Debug: Check Personalize configuration if variant is still base
        if (!variantParam || variantParam === 'base') {
          console.warn('[Personalize] ⚠️ No variant found. Checking Personalize configuration...');
          console.warn('[Personalize] 💡 Run checkPersonalizeConfig() in console to see experiences/variants');
          // Auto-check config for debugging
          setTimeout(() => {
            checkPersonalizeConfig().catch(console.error);
          }, 1000);
        }

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
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Re-initialize SDK (it will automatically read fresh data from Lytics)
      // Use instance-based approach (v1.0.9+)
      const personalizeObj = Personalize as any;
      const personalizeSdk = await personalizeObj.init(PERSONALIZE_PROJECT_UID, {
        edgeMode: true,
      } as any);
      
      // Get personalization data from SDK instance
      let personalizeData: any = null;
      
      try {
        // Try getVariants() first
        if (typeof personalizeSdk.getVariants === 'function') {
          const variants = personalizeSdk.getVariants();
          if (Array.isArray(variants) && variants.length > 0) {
            const primaryVariant = variants[0];
            personalizeData = {
              variantParam: primaryVariant.variantParam || primaryVariant.variant_uid || '',
              audiences: primaryVariant.audiences || [],
              experienceUid: primaryVariant.experienceUid || primaryVariant.experience_uid || '',
              variantAlias: primaryVariant.variantAlias || primaryVariant.alias || null,
            };
          }
        }
        
        // If getVariants didn't work, try getActiveVariant()
        if (!personalizeData && typeof personalizeSdk.getActiveVariant === 'function') {
          const activeVariant = personalizeSdk.getActiveVariant();
          if (activeVariant) {
            personalizeData = {
              variantParam: activeVariant.variantParam || activeVariant.variant_uid || '',
              audiences: activeVariant.audiences || [],
              experienceUid: activeVariant.experienceUid || activeVariant.experience_uid || '',
              variantAlias: activeVariant.variantAlias || activeVariant.alias || null,
            };
          }
        }
        
        // If still no data, try getExperiences()
        if (!personalizeData && typeof personalizeSdk.getExperiences === 'function') {
          const experiences = personalizeSdk.getExperiences();
          if (Array.isArray(experiences) && experiences.length > 0) {
            const firstExperience = experiences[0];
            personalizeData = {
              variantParam: firstExperience.variantParam || firstExperience.variant_uid || '',
              audiences: firstExperience.audiences || [],
              experienceUid: firstExperience.experienceUid || firstExperience.experience_uid || '',
              variantAlias: firstExperience.variantAlias || firstExperience.alias || null,
            };
          }
        }
        
        // Last resort: try getVariantParam()
        if (!personalizeData && typeof personalizeSdk.getVariantParam === 'function') {
          const variantParam = personalizeSdk.getVariantParam();
          if (variantParam) {
            personalizeData = {
              variantParam: variantParam,
              audiences: [],
              experienceUid: '',
              variantAlias: null,
            };
          }
        }
        
      } catch (error) {
        console.error('[Personalize] ❌ Error getting personalization data during refresh:', error);
        throw error;
      }
      
      if (!personalizeData) {
        throw new Error('Personalize SDK: Could not retrieve personalization data during refresh.');
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
  }, [waitForLytics]);

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


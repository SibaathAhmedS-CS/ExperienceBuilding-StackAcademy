/**
 * Utility to check Personalize configuration and experiences/variants
 * This helps debug why variants might not be matching
 */

import Personalize from '@contentstack/personalize-edge-sdk';

const PERSONALIZE_PROJECT_UID = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || '';

/**
 * Check Personalize experiences and variants configuration
 * This helps debug why activeVariantShortUid might be null
 */
export async function checkPersonalizeConfig(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('[Personalize Config] Can only run in browser');
    return;
  }

  if (!PERSONALIZE_PROJECT_UID) {
    console.error('[Personalize Config] ❌ No Project UID configured');
    return;
  }

  try {
    console.log('[Personalize Config] 🔍 Checking Personalize configuration...');
    
    // Initialize SDK
    const personalizeSdk = await Personalize.init(PERSONALIZE_PROJECT_UID, {
      edgeMode: true,
    } as any);

    // Get all experiences
    const experiences = personalizeSdk.getExperiences();
    console.log('[Personalize Config] 📊 Experiences:', experiences);
    
    if (Array.isArray(experiences) && experiences.length > 0) {
      experiences.forEach((exp: any, index: number) => {
        console.log(`[Personalize Config] Experience ${index + 1}:`, {
          shortUid: exp.shortUid,
          experienceUid: exp.experienceUid || exp.shortUid,
          activeVariantShortUid: exp.activeVariantShortUid,
          hasActiveVariant: exp.activeVariantShortUid !== null && exp.activeVariantShortUid !== undefined,
        });
      });
    } else {
      console.warn('[Personalize Config] ⚠️ No experiences found');
    }

    // Get all variants
    let variants: any = null;
    if (typeof personalizeSdk.getVariants === 'function') {
      try {
        variants = personalizeSdk.getVariants();
        console.log('[Personalize Config] 📊 Variants:', variants);
      } catch (error) {
        console.warn('[Personalize Config] ⚠️ Error calling getVariants():', error);
      }
    }
    
    // Get active variant (may require experience UID parameter)
    let activeVariant: any = null;
    if (typeof personalizeSdk.getActiveVariant === 'function') {
      try {
        // Try without arguments first
        activeVariant = (personalizeSdk.getActiveVariant as any)();
        console.log('[Personalize Config] 📊 Active Variant:', activeVariant);
      } catch (error) {
        // If it requires an argument, try with experience shortUid
        try {
          if (Array.isArray(experiences) && experiences.length > 0) {
            const firstExp = experiences[0];
            if (firstExp.shortUid) {
              activeVariant = (personalizeSdk.getActiveVariant as any)(firstExp.shortUid);
              console.log('[Personalize Config] 📊 Active Variant (with experience):', activeVariant);
            }
          }
        } catch (error2) {
          console.warn('[Personalize Config] ⚠️ Error calling getActiveVariant():', error2);
        }
      }
    }
    
    // Get variant param
    let variantParam: string | null = null;
    if (typeof personalizeSdk.getVariantParam === 'function') {
      try {
        variantParam = personalizeSdk.getVariantParam();
        console.log('[Personalize Config] 📊 Variant Param:', variantParam);
      } catch (error) {
        console.warn('[Personalize Config] ⚠️ Error calling getVariantParam():', error);
      }
    }
    
    // Get variant aliases
    let variantAliases: any = null;
    if (typeof personalizeSdk.getVariantAliases === 'function') {
      try {
        variantAliases = personalizeSdk.getVariantAliases();
        console.log('[Personalize Config] 📊 Variant Aliases:', variantAliases);
      } catch (error) {
        console.warn('[Personalize Config] ⚠️ Error calling getVariantAliases():', error);
      }
    }

    // Summary
    console.log('[Personalize Config] 📋 Summary:', {
      experiencesCount: Array.isArray(experiences) ? experiences.length : 0,
      hasActiveVariant: activeVariant !== null && activeVariant !== undefined,
      variantParam: variantParam || 'none',
      variantAliasesCount: Array.isArray(variantAliases) ? variantAliases.length : 0,
    });

  } catch (error) {
    console.error('[Personalize Config] ❌ Error checking configuration:', error);
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).checkPersonalizeConfig = checkPersonalizeConfig;
}


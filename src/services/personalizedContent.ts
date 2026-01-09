/**
 * Personalized Content Service
 * Based on reference implementation pattern
 */

import { getVariantAliases, initPersonalizeWithUser } from './personalize';
import { getUserSegments } from './lytics';
import { getEntry, getEntries, getPageByUrl } from '@/lib/contentstack';

export const getPersonalizedEntry = async (
  contentTypeUid: string,
  entryUid: string,
  userId: string | null = null,
  userEmail: string | null = null
): Promise<any> => {
  try {
    let variantAliases: string[] = [];
    
    if (userId) {
      await initPersonalizeWithUser(userId, userEmail);
      variantAliases = getVariantAliases();
    }

    // Note: Contentstack API calls would need variant aliases passed
    // Adjust based on your Contentstack API implementation
    const entry = await getEntry(contentTypeUid, entryUid);
    return entry;
  } catch (error) {
    console.error('Failed to get personalized entry:', error);
    return await getEntry(contentTypeUid, entryUid);
  }
};

export const getPersonalizedEntries = async (
  contentTypeUid: string,
  options: Record<string, unknown> = {},
  userId: string | null = null,
  userEmail: string | null = null
): Promise<any[]> => {
  try {
    let variantAliases: string[] = [];
    
    if (userId) {
      await initPersonalizeWithUser(userId, userEmail);
      variantAliases = getVariantAliases();
    }

    const entries = await getEntries(contentTypeUid, options);
    return entries;
  } catch (error) {
    console.error('Failed to get personalized entries:', error);
    return await getEntries(contentTypeUid, options);
  }
};

export const getPersonalizedPage = async (
  url: string,
  userId: string | null = null,
  userEmail: string | null = null
): Promise<any> => {
  try {
    let variantAliases: string[] = [];
    
    if (userId) {
      await initPersonalizeWithUser(userId, userEmail);
      variantAliases = getVariantAliases();
      console.log('[Personalize] Variant aliases for user:', variantAliases);
    }

    if (variantAliases.length > 0) {
      console.log('[Personalize] Fetching page with variants:', variantAliases);
    }
    
    const page = await getPageByUrl(url);
    
    if (variantAliases.length > 0) {
      console.log('[Personalize] Page response received:', page?.title, 'Variants applied:', variantAliases);
    }
    
    return page;
  } catch (error) {
    console.error('Failed to get personalized page:', error);
    return await getPageByUrl(url);
  }
};

export const getUserVariantAliases = async (
  userId: string | null = null,
  userEmail: string | null = null
): Promise<string[]> => {
  try {
    if (!userId) {
      return [];
    }

    await initPersonalizeWithUser(userId, userEmail);
    return getVariantAliases();
  } catch (error) {
    console.error('Failed to get user variant aliases:', error);
    return [];
  }
};

export const getUserSegmentsAndVariants = async (
  userId: string | null = null,
  userEmail: string | null = null
): Promise<{
  segments: string[];
  variantAliases: string[];
  hasPersonalization: boolean;
}> => {
  try {
    const segments = await getUserSegments();
    let variantAliases: string[] = [];
    
    if (userId) {
      await initPersonalizeWithUser(userId, userEmail);
      variantAliases = getVariantAliases();
    }

    return {
      segments,
      variantAliases,
      hasPersonalization: variantAliases.length > 0
    };
  } catch (error) {
    console.error('Failed to get user segments and variants:', error);
    return {
      segments: [],
      variantAliases: [],
      hasPersonalization: false
    };
  }
};

export default {
  getPersonalizedEntry,
  getPersonalizedEntries,
  getPersonalizedPage,
  getUserVariantAliases,
  getUserSegmentsAndVariants
};

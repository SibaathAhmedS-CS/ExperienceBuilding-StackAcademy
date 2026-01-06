'use client';

import { useState, useEffect } from 'react';
import { PageEntry } from '@/types/contentstack';
import { getPage, getPageByUrl } from '@/lib/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersonalizeSdk } from '@/hooks/usePersonalizeSdk';

/**
 * Custom hook to fetch page data from Contentstack by title
 * Falls back gracefully if CMS data is not available
 * @param title - Page title to fetch
 */
export function usePage(title: string) {
  const [pageData, setPageData] = useState<PageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();
  const { sdk: personalizeSdk, isReady: sdkReady } = usePersonalizeSdk();

  useEffect(() => {
    async function fetchPage() {
      try {
        setIsLoading(true);
        
        // Get variant aliases from Personalize SDK if available
        let variantAliases: string[] | undefined;
        if (sdkReady && personalizeSdk) {
          try {
            // Use getVariantAliases() instead of getVariantParam()
            variantAliases = personalizeSdk.getVariantAliases();
            if (variantAliases && variantAliases.length > 0) {
              console.log(`[Personalize] Using variant aliases:`, variantAliases);
            } else {
              console.log(`[Personalize] No variant aliases available (SDK ready but no variant)`);
            }
          } catch (err) {
            console.warn('[Personalize] Could not get variant aliases:', err);
          }
        } else {
          console.log(`[Personalize] SDK not ready yet, fetching without variant`);
        }
        
        const data = await getPage(title, selectedLanguage, variantAliases);
        
        setPageData(data);
        
        if (data) {
          console.log(`Page "${title}" fetched:`, {
            sectionsCount: data.section?.length || 0,
            hasHeader: !!data.header,
            variantAliases: variantAliases || [],
            sdkReady,
          });
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch page'));
      } finally {
        setIsLoading(false);
      }
    }

    if (!title) return;

    // Always fetch, but refetch when SDK becomes ready to get variant-specific content
    fetchPage();
  }, [title, selectedLanguage, sdkReady, personalizeSdk]);

  return { pageData, isLoading, error };
}

/**
 * Custom hook to fetch page data from Contentstack by URL
 */
export function usePageByUrl(url: string) {
  const [pageData, setPageData] = useState<PageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();
  const { sdk: personalizeSdk, isReady: sdkReady } = usePersonalizeSdk();

  useEffect(() => {
    async function fetchPage() {
      try {
        setIsLoading(true);
        
        // Get variant aliases from Personalize SDK if available
        let variantAliases: string[] | undefined;
        if (sdkReady && personalizeSdk) {
          try {
            // Use getVariantAliases() instead of getVariantParam()
            variantAliases = personalizeSdk.getVariantAliases();
            if (variantAliases && variantAliases.length > 0) {
              console.log(`[Personalize] Using variant aliases:`, variantAliases);
            } else {
              console.log(`[Personalize] No variant aliases available (SDK ready but no variant)`);
            }
          } catch (err) {
            console.warn('[Personalize] Could not get variant aliases:', err);
          }
        } else {
          console.log(`[Personalize] SDK not ready yet, fetching without variant`);
        }
        
        const data = await getPageByUrl(url, selectedLanguage, variantAliases);
        setPageData(data);
      } catch (err) {
        console.error('Error fetching page by URL:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch page'));
      } finally {
        setIsLoading(false);
      }
    }

    if (!url) return;

    // Always fetch, but refetch when SDK becomes ready to get variant-specific content
    fetchPage();
  }, [url, selectedLanguage, sdkReady, personalizeSdk]);

  return { pageData, isLoading, error };
}

export default usePage;



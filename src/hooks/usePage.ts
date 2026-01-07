'use client';

import { useState, useEffect, useRef } from 'react';
import { PageEntry } from '@/types/contentstack';
import { getPage, getPageByUrl, getPersonalizeVariant } from '@/lib/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Custom hook to fetch page data from Contentstack by title
 * Falls back gracefully if CMS data is not available
 * Refetches when variant changes for personalization
 * @param title - Page title to fetch
 */
export function usePage(title: string) {
  const [pageData, setPageData] = useState<PageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();
  const lastVariantRef = useRef<string | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchPage() {
      try {
        setIsLoading(true);
        
        const currentVariant = getPersonalizeVariant();
        console.log(`[usePage] Fetching page "${title}" with variant:`, currentVariant);
        
        const data = await getPage(title, selectedLanguage);
        
        setPageData(data);
        lastVariantRef.current = currentVariant;
        
        if (data) {
          console.log(`[usePage] Page "${title}" fetched:`, {
            sectionsCount: data.section?.length || 0,
            hasHeader: !!data.header,
            variant: currentVariant,
          });
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch page'));
      } finally {
        setIsLoading(false);
      }
    }

    // Check for variant changes and refetch if needed
    const checkVariantAndRefetch = () => {
      const currentVariant = getPersonalizeVariant();
      if (currentVariant && currentVariant !== lastVariantRef.current) {
        console.log(`[usePage] Variant changed from ${lastVariantRef.current} to ${currentVariant}, refetching page...`);
        fetchPage();
      }
    };

    if (title) {
      fetchPage();
      
      // Check for variant changes periodically (every 2 seconds for first 10 seconds)
      // This handles the case where variant is set after initial fetch
      let checkCount = 0;
      const maxChecks = 5;
      const checkInterval = setInterval(() => {
        checkCount++;
        checkVariantAndRefetch();
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      }, 2000);
      
      // Also listen for storage events (variant might be set in another tab/context)
      const handleStorageChange = () => {
        checkVariantAndRefetch();
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', handleStorageChange);
      }
      
      return () => {
        clearInterval(checkInterval);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorageChange);
        }
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      };
    }
  }, [title, selectedLanguage]);

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

  useEffect(() => {
    async function fetchPage() {
      try {
        setIsLoading(true);
        const data = await getPageByUrl(url, selectedLanguage);
        setPageData(data);
      } catch (err) {
        console.error('Error fetching page by URL:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch page'));
      } finally {
        setIsLoading(false);
      }
    }

    if (url) {
      fetchPage();
    }
  }, [url, selectedLanguage]);

  return { pageData, isLoading, error };
}

export default usePage;



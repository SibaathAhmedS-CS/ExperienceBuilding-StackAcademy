'use client';

import { useState, useEffect } from 'react';
import { PageEntry } from '@/types/contentstack';
import { getPage, getPageByUrl } from '@/lib/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Custom hook to fetch page data from Contentstack by title
 * Falls back gracefully if CMS data is not available
 */
export function usePage(title: string) {
  const [pageData, setPageData] = useState<PageEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    async function fetchPage() {
      try {
        setIsLoading(true);
        const data = await getPage(title, selectedLanguage);
        setPageData(data);
        
        if (data) {
          console.log(`Page "${title}" fetched:`, {
            sectionsCount: data.section?.length || 0,
            hasHeader: !!data.header,
          });
        }
      } catch (err) {
        console.error('Error fetching page:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch page'));
      } finally {
        setIsLoading(false);
      }
    }

    if (title) {
      fetchPage();
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



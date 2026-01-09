'use client';

import { useState, useEffect } from 'react';
import { FooterEntry, NewsletterEntry } from '@/types/contentstack';
import { getFooter, getNewsletter } from '@/lib/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Custom hook to fetch footer data from Contentstack
 * Falls back gracefully if CMS data is not available
 */
export function useFooter() {
  const [footerData, setFooterData] = useState<FooterEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    async function fetchFooter() {
      try {
        setIsLoading(true);
        const data = await getFooter(selectedLanguage);
        setFooterData(data);
      } catch (err) {
        console.error('Error fetching footer:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch footer'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchFooter();
  }, [selectedLanguage]);

  return { footerData, isLoading, error };
}

/**
 * Custom hook to fetch newsletter data from Contentstack
 * Falls back gracefully if CMS data is not available
 */
export function useNewsletter() {
  const [newsletterData, setNewsletterData] = useState<NewsletterEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    async function fetchNewsletter() {
      try {
        setIsLoading(true);
        const data = await getNewsletter(selectedLanguage);
        setNewsletterData(data);
      } catch (err) {
        console.error('Error fetching newsletter:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch newsletter'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchNewsletter();
  }, [selectedLanguage]);

  return { newsletterData, isLoading, error };
}

export default useFooter;


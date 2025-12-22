'use client';

import { useState, useEffect } from 'react';
import { FAQEntry } from '@/types/contentstack';
import { getFAQ } from '@/lib/contentstack';

/**
 * Custom hook to fetch FAQ data from Contentstack
 * Falls back gracefully if CMS data is not available
 */
export function useFAQ() {
  const [faqData, setFaqData] = useState<FAQEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFAQ() {
      try {
        setIsLoading(true);
        const data = await getFAQ();
        setFaqData(data);
      } catch (err) {
        console.error('Error fetching FAQ:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch FAQ'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchFAQ();
  }, []);

  return { faqData, isLoading, error };
}

export default useFAQ;


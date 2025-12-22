'use client';

import { useState, useEffect } from 'react';
import { HeaderEntry } from '@/types/contentstack';
import { getHeader } from '@/lib/contentstack';

/**
 * Custom hook to fetch header data from Contentstack
 * Falls back gracefully if CMS data is not available
 */
export function useHeader(headerTitle: 'Landing Header' | 'App Header') {
  const [headerData, setHeaderData] = useState<HeaderEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchHeader() {
      try {
        setIsLoading(true);
        const data = await getHeader(headerTitle);
        setHeaderData(data);
      } catch (err) {
        console.error('Error fetching header:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch header'));
        // Don't throw - let the component use fallback data
      } finally {
        setIsLoading(false);
      }
    }

    fetchHeader();
  }, [headerTitle]);

  return { headerData, isLoading, error };
}

export default useHeader;


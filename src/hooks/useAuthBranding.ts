'use client';

import { useState, useEffect } from 'react';
import { AuthBrandingEntry } from '@/types/contentstack';
import { getAuthBranding } from '@/lib/contentstack';

/**
 * Custom hook to fetch auth branding data from Contentstack
 */
export function useAuthBranding(pageType: 'login' | 'signup') {
  const [brandingData, setBrandingData] = useState<AuthBrandingEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchBranding() {
      try {
        setIsLoading(true);
        const data = await getAuthBranding(pageType);
        setBrandingData(data);
        
        if (data) {
          console.log(`Auth branding for ${pageType} fetched:`, {
            headline: data.headline,
            hasStats: !!(Array.isArray(data.stats) ? data.stats.length : data.stats),
            hasBrandingContent: !!data.branding_content,
          });
        }
      } catch (err) {
        console.error('Error fetching auth branding:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch auth branding'));
      } finally {
        setIsLoading(false);
      }
    }

    if (pageType) {
      fetchBranding();
    }
  }, [pageType]);

  return { brandingData, isLoading, error };
}


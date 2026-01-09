/**
 * usePersonalizedContent Hook
 * Based on reference implementation pattern
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getVariantAliases, getPersonalize } from '@/services/personalize';
import { getUserSegments } from '@/services/lytics';
import personalizedContent from '@/services/personalizedContent';

export const usePersonalizedContent = () => {
  const [variantAliases, setVariantAliases] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPersonalization = async () => {
      const supabase = createClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          try {
            const userSegments = await getUserSegments();
            setSegments(userSegments);

            const sdk = getPersonalize();
            if (sdk) {
              const aliases = getVariantAliases();
              setVariantAliases(aliases);
            }
          } catch (error) {
            console.error('Failed to load personalization:', error);
          }
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalization();
  }, []);

  const getPersonalizedEntry = useCallback(async (contentTypeUid: string, entryUid: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return await personalizedContent.getPersonalizedEntry(
      contentTypeUid,
      entryUid,
      user.id,
      user.email || null
    );
  }, []);

  const getPersonalizedEntries = useCallback(async (contentTypeUid: string, options: Record<string, unknown> = {}) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }
    
    return await personalizedContent.getPersonalizedEntries(
      contentTypeUid,
      options,
      user.id,
      user.email || null
    );
  }, []);

  const getPersonalizedPage = useCallback(async (url: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return await personalizedContent.getPersonalizedPage(
      url,
      user.id,
      user.email || null
    );
  }, []);

  return {
    variantAliases,
    segments,
    loading,
    hasPersonalization: variantAliases.length > 0,
    getPersonalizedEntry,
    getPersonalizedEntries,
    getPersonalizedPage
  };
};

export default usePersonalizedContent;

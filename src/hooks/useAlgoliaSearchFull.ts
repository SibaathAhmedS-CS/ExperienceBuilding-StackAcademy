'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSearchClient, getIndexName, AlgoliaCourseRecord } from '@/lib/algolia';
import { useLanguage } from '@/contexts/LanguageContext';

export function useAlgoliaSearchFull(query: string, hitsPerPage: number = 20) {
  const { selectedLanguage } = useLanguage();
  const [results, setResults] = useState<AlgoliaCourseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const indexName = useMemo(() => getIndexName(selectedLanguage), [selectedLanguage]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchClient = getSearchClient();
      
      // Algolia v5 lite client uses search() with array of requests
      searchClient
        .search([
          {
            indexName,
            params: {
              query,
              hitsPerPage,
              attributesToRetrieve: ['objectID', 'title', 'slug', 'instructor_name', 'difficulty_level', 'description', 'short_text', 'category', 'duration'],
              attributesToHighlight: ['title', 'description'],
            },
          },
        ])
        .then((response) => {
          const hits = response.results[0]?.hits || [];
          setResults(hits as AlgoliaCourseRecord[]);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Algolia search error:', err);
          setError(err instanceof Error ? err : new Error('Search failed'));
          setResults([]);
          setIsLoading(false);
        });
    } catch (err) {
      console.error('Algolia client error:', err);
      setError(err instanceof Error ? err : new Error('Search client initialization failed'));
      setResults([]);
      setIsLoading(false);
    }
  }, [query, indexName, hitsPerPage]);

  return { results, isLoading, error };
}


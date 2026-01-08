import { liteClient } from 'algoliasearch/lite';
import { algoliasearch } from 'algoliasearch';

// Algolia credentials from environment variables
function getAlgoliaConfig() {
  const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
  const ALGOLIA_SEARCH_API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '';
  const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';
  
  return { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, ALGOLIA_ADMIN_API_KEY };
}

// Lazy initialization of search client (only when needed, client-side)
let _searchClient: ReturnType<typeof liteClient> | null = null;
export function getSearchClient() {
  if (!_searchClient) {
    const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY } = getAlgoliaConfig();
    if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_API_KEY) {
      throw new Error('Algolia search credentials are missing. Please set NEXT_PUBLIC_ALGOLIA_APP_ID and NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY');
    }
    _searchClient = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);
  }
  return _searchClient;
}

// For backward compatibility, export searchClient as a getter
export const searchClient = new Proxy({} as ReturnType<typeof liteClient>, {
  get(_target, prop) {
    return getSearchClient()[prop as keyof ReturnType<typeof liteClient>];
  }
});

// Admin client (server-side only, for indexing)
let _adminClient: ReturnType<typeof algoliasearch> | null = null;
export function getAdminClient() {
  if (typeof window !== 'undefined') {
    return null; // Admin client is server-side only
  }
  
  if (!_adminClient) {
    const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY } = getAlgoliaConfig();
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      return null;
    }
    _adminClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
  }
  return _adminClient;
}

// Export adminClient for backward compatibility
export const adminClient = getAdminClient();

// Supported locales for Algolia indices
export const SUPPORTED_LOCALES = ['en-us', 'ta-in', 'te-in', 'fr-us', 'es'];

// Get index name based on locale
// Format: courses_en-us, courses_ta-in, courses_fr-us, etc.
export function getIndexName(locale: string = 'en-us'): string {
  // Normalize locale format (e.g., 'en-US' -> 'en-us')
  const normalizedLocale = locale.toLowerCase().replace('_', '-');
  
  // Handle special cases
  if (normalizedLocale === 'es' || normalizedLocale === 'es-es') {
    return 'courses_es';
  }
  
  return normalizedLocale;
}

// Course record structure for Algolia
export interface AlgoliaCourseRecord {
  objectID: string; // Course UID
  title: string;
  slug: string;
  description?: string;
  short_text?: string;
  instructor_name?: string;
  difficulty_level?: string;
  category?: string;
  duration?: number;
  locale: string;
  // Add other searchable fields as needed
}


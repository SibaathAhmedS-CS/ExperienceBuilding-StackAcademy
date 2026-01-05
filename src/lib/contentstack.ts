import Contentstack from 'contentstack';
import { 
  HeaderEntry, 
  FooterEntry, 
  NewsletterEntry, 
  FAQEntry,
  PageEntry,
  BannerEntry,
  TestimonialEntry,
  HeroBlockEntry,
  CategoryEntry,
  CourseEntry,
  ModuleEntry,
  LessonEntry,
  OnboardingBlockEntry,
  AuthBrandingEntry,
  AuthorEntry
} from '@/types/contentstack';

// Contentstack SDK Configuration
const Stack = Contentstack.Stack({
  api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || process.env.CONTENTSTACK_API_KEY || '',
  delivery_token: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || process.env.CONTENTSTACK_DELIVERY_TOKEN || '',
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || process.env.CONTENTSTACK_ENVIRONMENT || 'dev',
  branch: process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || process.env.CONTENTSTACK_BRANCH || 'main',
});

// Type definitions for Contentstack entries
export interface ContentstackEntry {
  uid: string;
  title: string;
  url?: string;
  [key: string]: any;
}

export interface ContentstackAsset {
  uid: string;
  url: string;
  title: string;
  filename: string;
}

// Content Type UIDs - Match your Contentstack setup
export const CONTENT_TYPES = {
  PAGE: 'modular_section',  // Page content type (modular sections)
  BANNER: 'banner',
  HEADER: 'header',
  FOOTER: 'footer',
  NEWSLETTER: 'newsletter',
  ICON: 'icon',
  FAQ: 'faq',
  FAQ_QUESTION: 'faq_question',
  TESTIMONIAL: 'testimonial',
  AUTHOR: 'author',
  COURSE: 'courses',  // Course content type
  MODULE: 'module',   // Module content type
  LESSON: 'lesson',   // Lesson content type
  CATEGORY: 'categories_block',  // Updated to match new content type
  CATEGORY_BLOCK: 'category_block',  // Singleton for referencing categories
  INSTRUCTOR: 'instructor',
  ONBOARDING: 'onboarding_block',  // Onboarding steps content type
  AUTH_BRANDING: 'auth_branding',  // Auth branding content type for login/signup pages
} as const;

// ============================================
// PERSONALIZATION SUPPORT
// ============================================

// Store the current variant alias for personalized content
let currentVariantAlias: string | null = null;

/**
 * Set the variant alias for personalized content fetching
 * Called by usePersonalize hook when user's audience is determined
 */
export function setPersonalizeVariant(variant: string | null): void {
  currentVariantAlias = variant;
  console.log(`[CMS] Variant set to: ${variant || 'base'}`);
}

/**
 * Get the current variant alias
 */
export function getPersonalizeVariant(): string | null {
  return currentVariantAlias;
}

// ============================================
// Generic Fetch Helpers
// ============================================

/**
 * Get current locale from localStorage (client-side) or default
 */
function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedLanguage') || 'en-us';
  }
  return 'en-us';
}

/**
 * Default fallback locale when content is not available in selected locale
 */
const FALLBACK_LOCALE = 'en-us';

/**
 * Fetch single entry by content type and UID
 */
export async function getEntry<T = ContentstackEntry>(
  contentType: string,
  entryUid: string,
  referenceFields: string[] = [],
  locale?: string
): Promise<T | null> {
  try {
    const query = Stack.ContentType(contentType).Entry(entryUid);
    
    // Set locale if provided
    const targetLocale = locale || getCurrentLocale();
    query.language(targetLocale);
    
    referenceFields.forEach((field) => {
      query.includeReference(field);
    });

    const result = await query.toJSON().fetch();
    return result as T;
  } catch (error) {
    console.error(`Error fetching entry: ${contentType}/${entryUid}`, error);
    return null;
  }
}

/**
 * Fetch entries by content type with options
 */
export async function getEntries<T = ContentstackEntry>(
  contentType: string,
  options: {
    referenceFields?: string[];
    limit?: number;
    skip?: number;
    orderBy?: string;
    locale?: string;
    orderDirection?: 'asc' | 'desc';
    where?: Record<string, any>;
  } = {}
): Promise<T[]> {
  try {
    const query = Stack.ContentType(contentType).Query();
    
    // Set locale if provided
    const targetLocale = options.locale || getCurrentLocale();
    query.language(targetLocale);
    
    if (options.referenceFields) {
      options.referenceFields.forEach((field) => {
        query.includeReference(field);
      });
    }

    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);

    if (options.orderBy) {
      if (options.orderDirection === 'desc') {
        query.descending(options.orderBy);
      } else {
        query.ascending(options.orderBy);
      }
    }

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query.where(key, value);
      });
    }

    const result = await query.toJSON().find();
    return (result[0] || []) as T[];
  } catch (error) {
    console.error(`Error fetching entries: ${contentType}`, error);
    return [];
  }
}

/**
 * Fetch entry by URL
 */
export async function getEntryByUrl<T = ContentstackEntry>(
  contentType: string,
  url: string,
  referenceFields: string[] = []
): Promise<T | null> {
  try {
    const query = Stack.ContentType(contentType).Query().where('url', url);
    
    referenceFields.forEach((field) => {
      query.includeReference(field);
    });

    const result = await query.toJSON().find();
    return result[0]?.[0] as T || null;
  } catch (error) {
    console.error(`Error fetching entry by URL: ${contentType}/${url}`, error);
    return null;
  }
}

// ============================================
// Page (Modular Section) Fetch Functions
// ============================================

/**
 * Fetch Page entry by title with all nested references
 * This is the main function for fetching page content
 * Supports locale for fetching localized content
 */
export async function getPage(title: string, locale?: string): Promise<PageEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.PAGE)
      .Query()
      .where('title', title)
      .includeReference([
        'header',
        'header.icon',
        'section.hero_block.hero_banner',        // Hero Banner reference
        'section.carousel_block.banner',          // Banner references for carousel
        'section.carousel_block.banner.banner_image', // Banner image asset for localized entries
        'section.category_block.icon',            // Legacy category icons
        'section.category_block.category',        // New category references (categories_block)
        'section.feature_block.features',         // Feature icons
        'section.workflow_block.stage',           // Workflow stage icons
        'section.testimonial_block.testimonial',  // Testimonial entries
        'section.testimonial_block.testimonial.author', // Testimonial authors
      ]);

    // Set locale for content fetching
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let pageEntry = result[0]?.[0] as PageEntry || null;
    
    // Fallback to en-us if no page found in selected locale
    if (!pageEntry && targetLocale !== FALLBACK_LOCALE) {
      console.log(`[CMS] Page "${title}" not found in ${targetLocale}, falling back to ${FALLBACK_LOCALE}`);
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.PAGE)
        .Query()
        .where('title', title)
        .includeReference([
          'header',
          'header.icon',
          'section.hero_block.hero_banner',
          'section.carousel_block.banner',
          'section.carousel_block.banner.banner_image', // Banner image asset for localized entries
          'section.category_block.icon',
          'section.category_block.category',
          'section.feature_block.features',
          'section.workflow_block.stage',
          'section.testimonial_block.testimonial',
          'section.testimonial_block.testimonial.author',
        ]);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      pageEntry = fallbackResult[0]?.[0] as PageEntry || null;
    }
    
    // Debug logging
    if (pageEntry) {
      console.log(`[CMS] Page "${title}" loaded with ${pageEntry.section?.length || 0} sections`);
    }
    
    return pageEntry;
  } catch (error) {
    console.error(`Error fetching page: ${title}`, error);
    return null;
  }
}

/**
 * Deep merge variant sections with base entry sections
 * Contentstack variants only return changed fields, so we need to merge properly
 */
function mergeVariantWithBase(baseEntry: PageEntry, variantEntry: PageEntry): PageEntry {
  if (!baseEntry.section || !variantEntry.section) {
    return variantEntry.section ? variantEntry : baseEntry;
  }

  // Create a map of variant sections by their metadata UID
  const variantSectionMap = new Map<string, any>();
  for (const section of variantEntry.section) {
    const blockType = Object.keys(section)[0];
    const block = (section as any)[blockType];
    const metadataUid = block?._metadata?.uid;
    if (metadataUid) {
      variantSectionMap.set(metadataUid, section);
    }
  }

  // Deep merge: combine variant fields with base fields for each section
  const mergedSections = baseEntry.section.map(baseSection => {
    const blockType = Object.keys(baseSection)[0];
    const baseBlock = (baseSection as any)[blockType];
    const metadataUid = baseBlock?._metadata?.uid;
    
    if (metadataUid && variantSectionMap.has(metadataUid)) {
      const variantSection = variantSectionMap.get(metadataUid);
      const variantBlock = variantSection[blockType];
      
      // Deep merge the blocks - variant fields override base fields
      const mergedBlock = {
        ...baseBlock,
        ...variantBlock,
        // Explicitly merge nested objects that might have partial overrides
        title_and_description: {
          ...baseBlock?.title_and_description,
          ...variantBlock?.title_and_description,
        },
        query: {
          ...baseBlock?.query,
          ...variantBlock?.query,
        },
      };
      
      return { [blockType]: mergedBlock } as typeof baseSection;
    }
    // Keep base section unchanged
    return baseSection;
  });

  return {
    ...baseEntry,
    ...variantEntry,
    section: mergedSections,
  };
}

/**
 * Fetch Page entry by title with a specific variant
 * Used for personalization - fetches variant content based on audience
 * @param title - Page title
 * @param variantAlias - Variant alias (e.g., "cs_personalize_0_4")
 * @param locale - Optional locale
 */
export async function getPageWithVariant(
  title: string, 
  variantAlias: string, 
  locale?: string
): Promise<PageEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First, fetch the base page (we need all sections including unmodified ones)
    const basePage = await getPage(title, targetLocale);
    if (!basePage) {
      console.log(`[CMS] Base page "${title}" not found`);
      return null;
    }
    
    // Get API credentials
    const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || process.env.CONTENTSTACK_API_KEY || '';
    const deliveryToken = process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || process.env.CONTENTSTACK_DELIVERY_TOKEN || '';
    const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || process.env.CONTENTSTACK_ENVIRONMENT || 'dev';
    const branch = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || process.env.CONTENTSTACK_BRANCH || 'main';
    
    // Build the query URL with variant parameter
    const baseUrl = 'https://cdn.contentstack.io/v3';
    
    // Reference fields to include
    const includeRefs = [
      'header',
      'header.icon',
      'section.carousel_block.banner',
      'section.carousel_block.banner.banner_image',
      'section.category_block.icon',
      'section.category_block.category',
      'section.feature_block.features',
      'section.workflow_block.stage',
      'section.testimonial_block.testimonial',
      'section.testimonial_block.testimonial.author',
    ];
    
    // Build URL with proper include[] format for REST API
    const queryObj = encodeURIComponent(JSON.stringify({ title }));
    let url = `${baseUrl}/content_types/${CONTENT_TYPES.PAGE}/entries?query=${queryObj}&locale=${targetLocale}&environment=${environment}`;
    
    // Add each include as a separate parameter (REST API format)
    includeRefs.forEach(ref => {
      url += `&include[]=${encodeURIComponent(ref)}`;
    });
    
    console.log(`[CMS] Fetching variant "${variantAlias}" for page "${title}"`);
    
    // Make API call with variant header
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
        'access_token': deliveryToken,
        'branch': branch,
        'x-cs-variant-uid': variantAlias,
      },
      cache: 'no-store',
    });
    
    console.log(`[CMS] Variant API response status:`, response.status);
    
    if (!response.ok) {
      console.log(`[CMS] Variant API failed, using base page`);
      return basePage;
    }
    
    const data = await response.json();
    const entries = data.entries || [];
    
    console.log(`[CMS] Variant API - entries found:`, entries.length);
    
    if (entries.length > 0) {
      const variantEntry = entries[0] as PageEntry;
      
      // Debug: Log variant sections received
      const variantCardBlocks = variantEntry.section?.filter((s: any) => s.card_block) || [];
      console.log(`[CMS] Variant raw data:`, {
        sectionsCount: variantEntry.section?.length || 0,
        cardBlockQueries: variantCardBlocks.map((b: any) => ({
          title: b.card_block?.title_and_description?.title,
          query: b.card_block?.query,
        })),
      });
      
      // Merge variant sections with base page sections
      const mergedEntry = mergeVariantWithBase(basePage, variantEntry);
      
      const cardBlocks = mergedEntry.section?.filter((s: any) => s.card_block) || [];
      const carouselBlocks = mergedEntry.section?.filter((s: any) => s.carousel_block) || [];
      
      console.log(`[CMS] Merged page "${title}":`, {
        variant: variantAlias,
        totalSections: mergedEntry.section?.length || 0,
        cardBlocks: cardBlocks.length,
        carouselBlocks: carouselBlocks.length,
        cardBlockQueries: cardBlocks.map((b: any) => b.card_block?.query),
      });
      
      return mergedEntry;
    }
    
    // No variant entries found, return base page
    console.log(`[CMS] No variant entries, using base page`);
    return basePage;
    
  } catch (error) {
    console.error(`Error fetching page with variant: ${title}/${variantAlias}`, error);
    // Fallback to base page on error
    return await getPage(title, locale);
  }
}

/**
 * Fetch Page entry by URL
 */
export async function getPageByUrl(url: string, locale?: string): Promise<PageEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    let pageEntry: PageEntry | null = null;
    
    try {
      const query = Stack.ContentType(CONTENT_TYPES.PAGE)
        .Query()
        .where('url', url)
        .includeReference([
          'header',
          'header.icon',
          'section.carousel_block.banner',
          'section.carousel_block.banner.banner_image',
          'section.category_block.icon',
          'section.category_block.category',
          'section.feature_block.features',
          'section.workflow_block.stage',
          'section.testimonial_block.testimonial',
          'section.testimonial_block.testimonial.author',
        ]);
      
      query.language(targetLocale);

      const result = await query.toJSON().find();
      pageEntry = result[0]?.[0] as PageEntry || null;
    } catch (localeError) {
      // Fallback to en-us if not found
      if (targetLocale !== FALLBACK_LOCALE) {
        console.log(`[CMS] Page URL ${url} not found in ${targetLocale}, falling back to ${FALLBACK_LOCALE}`);
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.PAGE)
          .Query()
          .where('url', url)
          .includeReference([
            'header',
            'header.icon',
            'section.carousel_block.banner',
            'section.carousel_block.banner.banner_image',
            'section.category_block.icon',
            'section.category_block.category',
            'section.feature_block.features',
            'section.workflow_block.stage',
            'section.testimonial_block.testimonial',
            'section.testimonial_block.testimonial.author',
          ]);
        fallbackQuery.language(FALLBACK_LOCALE);
        
        const fallbackResult = await fallbackQuery.toJSON().find();
        pageEntry = fallbackResult[0]?.[0] as PageEntry || null;
      } else {
        throw localeError;
      }
    }
    
    // If still no page entry, try fallback
    if (!pageEntry && targetLocale !== FALLBACK_LOCALE) {
      console.log(`[CMS] Page URL ${url} not found in ${targetLocale}, falling back to ${FALLBACK_LOCALE}`);
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.PAGE)
        .Query()
        .where('url', url)
        .includeReference([
          'header',
          'header.icon',
          'section.carousel_block.banner',
          'section.carousel_block.banner.banner_image',
          'section.category_block.icon',
          'section.category_block.category',
          'section.feature_block.features',
          'section.workflow_block.stage',
          'section.testimonial_block.testimonial',
          'section.testimonial_block.testimonial.author',
        ]);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      pageEntry = fallbackResult[0]?.[0] as PageEntry || null;
    }

    return pageEntry;
  } catch (error) {
    console.error(`Error fetching page by URL: ${url}`, error);
    return null;
  }
}

// ============================================
// Category Fetch Functions
// ============================================

/**
 * Fetch all Category entries
 */
export async function getAllCategories(): Promise<CategoryEntry[]> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.CATEGORY)
      .Query()
      .toJSON()
      .find();
    return (result[0] || []) as CategoryEntry[];
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
}

// ============================================
// Header Fetch Functions
// ============================================

/**
 * Fetch Header entry by title
 * Header is always fetched in English since it contains non-translatable UI config
 * @param title - "Landing Header" or "App Header"
 */
export async function getHeader(title: string): Promise<HeaderEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.HEADER)
      .Query()
      .where('title', title)
      .includeReference('icon');

    // Always fetch header in English (contains UI configuration, not translated content)
    query.language('en-us');

    const result = await query.toJSON().find();
    const header = result[0]?.[0] as HeaderEntry || null;
    
    if (header) {
      console.log(`[CMS] Header "${title}" loaded with ${header.accessibility_language?.length || 0} languages`);
    }
    
    return header;
  } catch (error) {
    console.error(`Error fetching header: ${title}`, error);
    return null;
  }
}

/**
 * Fetch all Headers
 */
export async function getAllHeaders(): Promise<HeaderEntry[]> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.HEADER)
      .Query()
      .includeReference('icon')
      .toJSON()
      .find();
    return (result[0] || []) as HeaderEntry[];
  } catch (error) {
    console.error('Error fetching all headers', error);
    return [];
  }
}

// ============================================
// Footer & Newsletter Fetch Functions
// ============================================

/**
 * Fetch Footer entry (singleton)
 * Supports locale for fetching localized content
 */
export async function getFooter(locale?: string): Promise<FooterEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.FOOTER)
      .Query()
      .includeReference('icon');
    
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let footer = result[0]?.[0] as FooterEntry || null;
    
    // Fallback to en-us if not found
    if (!footer && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.FOOTER)
        .Query()
        .includeReference('icon');
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      footer = fallbackResult[0]?.[0] as FooterEntry || null;
    }
    
    return footer;
  } catch (error) {
    console.error('Error fetching footer', error);
    return null;
  }
}

/**
 * Fetch Newsletter entry (singleton)
 * Supports locale for fetching localized content
 */
export async function getNewsletter(locale?: string): Promise<NewsletterEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.NEWSLETTER)
      .Query()
      .includeReference('icon');
    
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let newsletter = result[0]?.[0] as NewsletterEntry || null;
    
    // Fallback to en-us if not found
    if (!newsletter && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.NEWSLETTER)
        .Query()
        .includeReference('icon');
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      newsletter = fallbackResult[0]?.[0] as NewsletterEntry || null;
    }
    
    return newsletter;
  } catch (error) {
    console.error('Error fetching newsletter', error);
    return null;
  }
}

// ============================================
// FAQ Fetch Functions
// ============================================

/**
 * Fetch FAQ entry (singleton) with nested references
 * Supports locale for fetching localized content
 */
export async function getFAQ(locale?: string): Promise<FAQEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.FAQ)
      .Query()
      .includeReference(['icon', 'faq_question']);
    
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let faqEntry = result[0]?.[0] as FAQEntry || null;
    
    // Fallback to en-us if not found
    if (!faqEntry && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.FAQ)
        .Query()
        .includeReference(['icon', 'faq_question']);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      faqEntry = fallbackResult[0]?.[0] as FAQEntry || null;
    }
    
    if (faqEntry) {
      console.log(`[CMS] FAQ Entry fetched (${targetLocale}):`, {
        title: faqEntry.section_title,
        hasIcon: !!faqEntry.icon,
        faqQuestionType: Array.isArray(faqEntry.faq_question) ? 'array' : 'object',
      });
    }
    
    return faqEntry;
  } catch (error) {
    console.error('Error fetching FAQ', error);
    return null;
  }
}

// ============================================
// Banner Fetch Functions
// ============================================

/**
 * Fetch all Banner entries
 */
export async function getAllBanners(): Promise<BannerEntry[]> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.BANNER)
      .Query()
      .toJSON()
      .find();
    return (result[0] || []) as BannerEntry[];
  } catch (error) {
    console.error('Error fetching banners', error);
    return [];
  }
}

// ============================================
// Testimonial Fetch Functions
// ============================================

/**
 * Fetch all Testimonial entries with author reference
 */
export async function getAllTestimonials(): Promise<TestimonialEntry[]> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.TESTIMONIAL)
      .Query()
      .includeReference('author')
      .toJSON()
      .find();
    return (result[0] || []) as TestimonialEntry[];
  } catch (error) {
    console.error('Error fetching testimonials', error);
    return [];
  }
}

// ============================================
// Course Fetch Functions
// ============================================

/**
 * Fetch all courses with author reference
 * Falls back to English if no content found in selected locale
 */
export async function getAllCourses(locale?: string): Promise<CourseEntry[]> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First try with selected locale
    const query = Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules']);
    query.language(targetLocale);
    
    const result = await query.toJSON().find();
    let courses = (result[0] || []) as CourseEntry[];
    
    // If no courses found and we're not already using fallback, try fallback locale
    if (courses.length === 0 && targetLocale !== FALLBACK_LOCALE) {
      console.log(`[CMS] No courses found in ${targetLocale}, falling back to ${FALLBACK_LOCALE}`);
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
        .Query()
        .includeReference(['author', 'modules']);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      courses = (fallbackResult[0] || []) as CourseEntry[];
    }
    
    // Resolve author references for all courses
    const resolvedCourses = await Promise.all(
      courses.map(course => resolveAuthorReferences(course))
    );
    
    return resolvedCourses;
  } catch (error) {
    console.error('Error fetching courses', error);
    return [];
  }
}

/**
 * Fetch author by UID - always fetches from default locale since authors are not localized
 */
async function getAuthorByUid(uid: string): Promise<AuthorEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.AUTHOR)
      .Entry(uid);
    // Always fetch authors in fallback locale since author data (name, bio) is non-localizable
    query.language(FALLBACK_LOCALE);
    
    const result = await query.toJSON().fetch();
    return result as AuthorEntry;
  } catch (error) {
    console.error(`Error fetching author by UID: ${uid}`, error);
    return null;
  }
}

/**
 * Helper to resolve author references that may not be fully populated
 * When fetching localized content, references to non-localized entries may not resolve
 * This function always fetches author data from the fallback locale to ensure consistency
 */
async function resolveAuthorReferences(course: CourseEntry): Promise<CourseEntry> {
  if (!course.author) return course;
  
  const authors = Array.isArray(course.author) ? course.author : [course.author];
  const resolvedAuthors: AuthorEntry[] = [];
  
  for (const author of authors) {
    // Always fetch the full author data from fallback locale to ensure we have all fields
    // This is because author data (name, bio, social links) is marked as non-localizable
    // but when fetching course in a different locale, the reference may not resolve properly
    if (author.uid) {
      // Always fetch fresh to ensure we get complete data
      const fullAuthor = await getAuthorByUid(author.uid);
      if (fullAuthor) {
        resolvedAuthors.push(fullAuthor);
      } else if (author.title) {
        // Fallback: if fetch fails but we have partial data, use it
        resolvedAuthors.push(author);
      }
    } else if (author.title) {
      // No UID but has title - use as is
      resolvedAuthors.push(author);
    }
  }
  
  course.author = resolvedAuthors.length > 0 ? resolvedAuthors : undefined;
  return course;
}

/**
 * Fetch a single course by slug with all nested references
 * Falls back to English if no content found in selected locale
 * Also handles localized slugs (e.g., "course-name-tamil" vs "course-name")
 */
export async function getCourseBySlug(slug: string, locale?: string): Promise<CourseEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First try with selected locale
    const query = Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .where('slug', slug)
      .includeReference([
        'author',
        'modules',
        'modules.lessons'
      ]);
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let course = result[0]?.[0] as CourseEntry || null;
    
    // If no course found, try with fallback locale first (maybe slug is the same but no localized content)
    if (!course && targetLocale !== FALLBACK_LOCALE) {
      console.log(`[CMS] Course slug "${slug}" not found in ${targetLocale}, trying ${FALLBACK_LOCALE}...`);
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
        .Query()
        .where('slug', slug)
        .includeReference([
          'author',
          'modules',
          'modules.lessons'
        ]);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      const fallbackCourse = fallbackResult[0]?.[0] as CourseEntry || null;
      
      if (fallbackCourse) {
        // Found in fallback, now try to fetch the localized version by UID
        console.log(`[CMS] Found course by slug in fallback locale, fetching localized content for ${targetLocale}...`);
        const localizedCourse = await getCourseByUid(fallbackCourse.uid, targetLocale);
        course = localizedCourse || fallbackCourse;
      }
    }
    
    // Ensure author references are fully resolved
    if (course) {
      course = await resolveAuthorReferences(course);
      console.log(`[CMS] Course "${course.title}" loaded with ${Array.isArray(course.modules) ? course.modules.length : course.modules ? 1 : 0} modules`);
    }
    
    return course;
  } catch (error) {
    console.error(`Error fetching course by slug: ${slug}`, error);
    return null;
  }
}

/**
 * Fetch a single course by UID with all nested references
 * Falls back to English if no content found in selected locale
 */
export async function getCourseByUid(uid: string, locale?: string): Promise<CourseEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    let course: CourseEntry | null = null;
    
    // First try with selected locale
    try {
      const query = Stack.ContentType(CONTENT_TYPES.COURSE)
        .Entry(uid)
        .includeReference([
          'author',
          'modules',
          'modules.lessons'
        ]);
      query.language(targetLocale);
      
      const result = await query.toJSON().fetch();
      course = result as CourseEntry;
    } catch (localeError) {
      // If locale fetch fails and we're not already using fallback, try fallback
      if (targetLocale !== FALLBACK_LOCALE) {
        console.log(`[CMS] Course UID ${uid} not found in ${targetLocale}, falling back to ${FALLBACK_LOCALE}`);
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
          .Entry(uid)
          .includeReference([
            'author',
            'modules',
            'modules.lessons'
          ]);
        fallbackQuery.language(FALLBACK_LOCALE);
        
        const fallbackResult = await fallbackQuery.toJSON().fetch();
        course = fallbackResult as CourseEntry;
      } else {
        throw localeError;
      }
    }
    
    // Ensure author references are fully resolved
    if (course) {
      course = await resolveAuthorReferences(course);
    }
    
    return course;
  } catch (error) {
    console.error(`Error fetching course by UID: ${uid}`, error);
    return null;
  }
}

// ============================================
// Module Fetch Functions
// ============================================

/**
 * Fetch a single module by UID with lessons
 */
export async function getModuleByUid(uid: string): Promise<ModuleEntry | null> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.MODULE)
      .Entry(uid)
      .includeReference(['lessons'])
      .toJSON()
      .fetch();
    return result as ModuleEntry;
  } catch (error) {
    console.error(`Error fetching module by UID: ${uid}`, error);
    return null;
  }
}

// ============================================
// Lesson Fetch Functions
// ============================================

/**
 * Fetch a single lesson by UID
 */
export async function getLessonByUid(uid: string, locale?: string): Promise<LessonEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const entry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
    entry.language(targetLocale);
    
    let result = await entry.toJSON().fetch();
    
    // If not found, try fallback locale
    if (!result && targetLocale !== FALLBACK_LOCALE) {
      const fallbackEntry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
      fallbackEntry.language(FALLBACK_LOCALE);
      result = await fallbackEntry.toJSON().fetch();
    }
    
    return result as LessonEntry;
  } catch (error) {
    // Try fallback locale on error
    if ((locale || getCurrentLocale()) !== FALLBACK_LOCALE) {
      try {
        const fallbackEntry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
        fallbackEntry.language(FALLBACK_LOCALE);
        const result = await fallbackEntry.toJSON().fetch();
        return result as LessonEntry;
      } catch {
        // Fallback also failed
      }
    }
    console.error(`Error fetching lesson by UID: ${uid}`, error);
    return null;
  }
}

/**
 * Fetch a single lesson by slug
 */
export async function getLessonBySlug(slug: string, locale?: string): Promise<LessonEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.LESSON)
      .Query()
      .where('slug', slug);
    
    query.language(targetLocale);

    const result = await query.toJSON().find();
    let lesson = result[0]?.[0] as LessonEntry || null;
    
    // Try fallback locale if not found
    if (!lesson && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.LESSON)
        .Query()
        .where('slug', slug);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      lesson = fallbackResult[0]?.[0] as LessonEntry || null;
    }
    
    return lesson;
  } catch (error) {
    console.error(`Error fetching lesson by slug: ${slug}`, error);
    return null;
  }
}

/**
 * Fetch course data for a given lesson (to get course context)
 * Returns the course that contains this lesson
 */
export async function getCourseByLessonUid(lessonUid: string, locale?: string): Promise<CourseEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First, find which module contains this lesson
    const modulesQuery = Stack.ContentType(CONTENT_TYPES.MODULE)
      .Query()
      .includeReference(['lessons']);
    modulesQuery.language(targetLocale);
    
    let modulesResult = await modulesQuery.toJSON().find();
    
    // Fallback if no modules found
    if (!modulesResult[0]?.length && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.MODULE)
        .Query()
        .includeReference(['lessons']);
      fallbackQuery.language(FALLBACK_LOCALE);
      modulesResult = await fallbackQuery.toJSON().find();
    }
    
    const modules = (modulesResult[0] || []) as ModuleEntry[];
    let targetModuleUid: string | null = null;
    
    for (const module of modules) {
      const lessons = Array.isArray(module.lessons) ? module.lessons : module.lessons ? [module.lessons] : [];
      if (lessons.some(lesson => lesson.uid === lessonUid)) {
        targetModuleUid = module.uid;
        break;
      }
    }
    
    if (!targetModuleUid) return null;
    
    // Now find the course that contains this module
    const coursesQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules', 'modules.lessons']);
    coursesQuery.language(targetLocale);
    
    let coursesResult = await coursesQuery.toJSON().find();
    
    // Fallback if no courses found
    if (!coursesResult[0]?.length && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
        .Query()
        .includeReference(['author', 'modules', 'modules.lessons']);
      fallbackQuery.language(FALLBACK_LOCALE);
      coursesResult = await fallbackQuery.toJSON().find();
    }
    
    const courses = (coursesResult[0] || []) as CourseEntry[];
    
    for (const course of courses) {
      const courseModules = Array.isArray(course.modules) ? course.modules : course.modules ? [course.modules] : [];
      if (courseModules.some(m => m.uid === targetModuleUid)) {
        // Resolve author references for the matching course
        const resolvedCourse = await resolveAuthorReferences(course);
        return resolvedCourse;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching course by lesson UID: ${lessonUid}`, error);
    return null;
  }
}

// ============================================
// Onboarding Fetch Functions
// ============================================

/**
 * Fetch all onboarding steps
 * Returns steps sorted by current_step
 * Tries multiple content type names in case the exact name differs
 */
export async function getAllOnboardingSteps(): Promise<OnboardingBlockEntry[]> {
  // Try different possible content type names
  const possibleContentTypes = [
    'onboarding_block',
    'onboarding',
    'onboarding_step',
    'onboarding_steps',
    'modular_section',  // Maybe stored as modular sections with specific pattern
  ];

  for (const contentType of possibleContentTypes) {
    try {
      const baseQuery = Stack.ContentType(contentType).Query();
      
      // If it's modular_section, filter for onboarding entries
      if (contentType === 'modular_section') {
        baseQuery.where('title', 'Onboarding Step');
      } else {
        // For onboarding-specific content types, include option references
        baseQuery.includeReference('option');
      }
      
      baseQuery.ascending('current_step');  // Sort by step number

      const result = await baseQuery.toJSON().find();
      const entries = (result[0] || []) as any[];
      
      console.log(`[CMS] Attempted ${contentType}: Found ${entries.length} entries`);
      
      if (entries.length > 0) {
        // Filter and transform entries
        const onboardingEntries: OnboardingBlockEntry[] = entries
          .filter((entry: any) => {
            // Check if entry has onboarding-related fields
            return entry.current_step !== undefined || 
                   entry.label_text !== undefined ||
                   entry.title?.toLowerCase().includes('onboarding');
          })
          .map((entry: any) => {
            // Transform to OnboardingBlockEntry format
            return {
              uid: entry.uid || entry._id || '',
              title: entry.title,
              current_step: entry.current_step || parseInt(entry.title?.match(/\d+/)?.[0] || '1'),
              total_steps: entry.total_steps || 5,
              label_text: entry.label_text || entry.title || '',
              display_type: entry.display_type || 'Card Grid',
              option: entry.option || [],
              back_button_text: entry.back_button_text || 'Back',
              next_button_text: entry.next_button_text || 'Continue',
            } as OnboardingBlockEntry;
          });
        
        if (onboardingEntries.length > 0) {
          console.log(`[CMS] Successfully fetched ${onboardingEntries.length} onboarding steps from ${contentType}`);
          return onboardingEntries.sort((a, b) => a.current_step - b.current_step);
        }
      }
    } catch (error: any) {
      // Log the error but continue trying other content types
      console.log(`[CMS] Content type ${contentType} failed:`, error.message || error);
      continue;
    }
  }

  // If no content type found, try searching modular_section for any onboarding-related entries
  try {
    const query = Stack.ContentType(CONTENT_TYPES.PAGE)
      .Query()
      .includeReference(['section']);
    
    const result = await query.toJSON().find();
    const pages = (result[0] || []) as PageEntry[];
    
    // Look for pages with "Onboarding" in title
    const onboardingPages = pages.filter(page => 
      page.title?.toLowerCase().includes('onboarding')
    );
    
    if (onboardingPages.length > 0) {
      console.log('[CMS] Found onboarding page(s), but need proper content type structure');
    }
  } catch (error) {
    console.error('Error searching for onboarding page:', error);
  }

  console.warn('[CMS] No onboarding content type found. Please check:');
  console.warn('1. Content type name in Contentstack (might be different)');
  console.warn('2. Entries are published');
  console.warn('3. API keys and environment are correct');
  return [];
}

// ============================================
// Auth Branding Fetch Functions
// ============================================

/**
 * Fetch Auth Branding entry by page type (login or signup)
 * Matches Contentstack schema: page_type is "Sign In" or "Sign Up"
 */
export async function getAuthBranding(pageType: 'login' | 'signup'): Promise<AuthBrandingEntry | null> {
  try {
    // Convert lowercase to Contentstack format
    const pageTypeValue = pageType === 'login' ? 'Sign In' : 'Sign Up';
    
    const query = Stack.ContentType(CONTENT_TYPES.AUTH_BRANDING)
      .Query()
      .where('page_type', pageTypeValue)
      .includeReference(['stats']);  // stats is reference to icon content type

    const result = await query.toJSON().find();
    const entries = (result[0] || []) as any[];
    
    if (entries.length > 0) {
      const entry = entries[0];
      
      // Log for debugging
      console.log(`[CMS] Auth branding entry for ${pageType}:`, {
        headline: entry.headline,
        subtitle: entry.subtitle,
        branding_content: entry.branding_content,
        stats: entry.stats,
        statsType: Array.isArray(entry.stats) ? 'array' : typeof entry.stats,
      });
      
      return {
        uid: entry.uid || entry._id || '',
        title: entry.title || '',
        page_type: entry.page_type || pageTypeValue,
        headline: entry.headline,
        subtitle: entry.subtitle,  // Field name is "subtitle" not "description"
        branding_content: entry.branding_content,  // Rich text content
        stats: entry.stats,  // Can be single IconEntry or array of IconEntry (should be expanded by includeReference)
        background_image: entry.background_image,
      } as AuthBrandingEntry;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching auth branding for ${pageType}:`, error);
    return null;
  }
}

// Export the Stack for advanced usage
export { Stack };

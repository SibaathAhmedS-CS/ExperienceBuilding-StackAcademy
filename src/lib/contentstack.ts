import Contentstack from 'contentstack';
import { addEditableTags } from "@contentstack/utils";
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
  AuthorEntry,
  isCarouselBlock,
  isHeroSectionBlock,
  isTestimonialBlock,
  normalizeArray
} from '@/types/contentstack';

// Contentstack SDK Configuration - Default Stack (uses Delivery Token)
const stackConfig: any = {
  api_key: process.env.CONTENTSTACK_API_KEY,
  delivery_token:  process.env.CONTENTSTACK_DELIVERY_TOKEN,
  environment: process.env.CONTENTSTACK_ENVIRONMENT,
  branch: process.env.CONTENTSTACK_BRANCH,
  region: process.env.CONTENTSTACK_REGION,
  live_preview: {
    enable: true,
    host: process.env.CONTENTSTACK_PREVIEW_HOST,
    preview_token: process.env.CONTENTSTACK_PREVIEW_TOKEN
  }
};

export const defaultStack = Contentstack.Stack(stackConfig);

/**
 * Get the Stack instance
 */
function getStack(): any {
  return defaultStack;
}

// Export default Stack for backward compatibility
const Stack = defaultStack;

/**
 * Create a fresh Stack instance with current environment variables
 * Useful for scripts that need to ensure env vars are loaded before Stack initialization
 */
export function createFreshStack(): any {
  const stackConfig: any = {
    api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || process.env.CONTENTSTACK_API_KEY || '',
    delivery_token: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || process.env.CONTENTSTACK_DELIVERY_TOKEN || '',
    environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || process.env.CONTENTSTACK_ENVIRONMENT || 'dev',
    branch: process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || process.env.CONTENTSTACK_BRANCH || 'main',
    region: process.env.CONTENTSTACK_REGION ? process.env.CONTENTSTACK_REGION : 'us',
  };
  
  return Contentstack.Stack(stackConfig);
}


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
 * Helper function to enrich banners with fallback images from default locale
 * This ensures non-localized banner_image assets are still displayed
 */
async function enrichBannersWithFallback(
  pageEntry: PageEntry | null,
  targetLocale: string
): Promise<void> {
  if (!pageEntry || targetLocale === FALLBACK_LOCALE) return;
  
  const sections = Array.isArray(pageEntry.section) ? pageEntry.section : [];
  for (const section of sections) {
    // Use type guard to narrow the type before accessing carousel_block
    if (isCarouselBlock(section) && section.carousel_block?.banner) {
      const banners = Array.isArray(section.carousel_block.banner) 
        ? section.carousel_block.banner 
        : [section.carousel_block.banner];
      
      // Check each banner for missing banner_image
      for (const banner of banners) {
        const hasImage = banner.banner_image?.url || 
                        (typeof banner.banner_image === 'string' && banner.banner_image) ||
                        (banner as any).image?.url ||
                        (banner as any).image_url;
        
        // If banner_image is missing, fetch from fallback locale
        if (!hasImage && banner.uid) {
          try {
            const fallbackBannerQuery = Stack.ContentType(CONTENT_TYPES.BANNER)
              .Entry(banner.uid);
            fallbackBannerQuery.language(FALLBACK_LOCALE);
            const fallbackBanner = await fallbackBannerQuery.toJSON().fetch() as BannerEntry | null;
            
            if (fallbackBanner?.banner_image) {
              // Merge fallback banner_image into current banner
              (banner as any).banner_image = fallbackBanner.banner_image;
            }
          } catch (error) {
          }
        }
      }
    }
  }
}

export async function getEntry<T = ContentstackEntry>(
  contentType: string,
  entryUid: string,
  referenceFields: string[] = [],
  locale?: string
): Promise<T | null> {
  try {
    const stack = getStack(); // Get appropriate Stack (delivery or preview)
    const query = stack.ContentType(contentType).Entry(entryUid);
    
    // Set locale if provided
    const targetLocale = locale || getCurrentLocale();
    query.language(targetLocale);
    
    referenceFields.forEach((field) => {
      query.includeReference(field);
    });

    // Apply variant header for personalization
    applyVariantHeader(query);

    const result = await query.toJSON().fetch();
    const entry = result as T;
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && entry && typeof entry === 'object' && 'uid' in entry) {
      addEditableTags(entry as any, contentType, true, locale);
    }
    
    return entry;
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
    const stack = getStack(); // Get appropriate Stack (delivery or preview)
    const query = stack.ContentType(contentType).Query();
    
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

    // Apply variant header for personalization
    applyVariantHeader(query);

    const result = await query.toJSON().find();
    const entries = (result[0] || []) as T[];
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && entries.length > 0) {
      entries.forEach((entry) => {
        if (entry && typeof entry === 'object' && 'uid' in entry) {
          addEditableTags(entry as any, contentType, true, options.locale);
        }
      });
    }
    
    return entries;
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
    const stack = getStack(); // Get appropriate Stack (delivery or preview)
    const query = stack.ContentType(contentType).Query().where('url', url);
    
    referenceFields.forEach((field) => {
      query.includeReference(field);
    });

    // Apply variant header for personalization
    applyVariantHeader(query);

    const result = await query.toJSON().find();
    const entry = result[0]?.[0] as T || null;
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && entry && typeof entry === 'object' && 'uid' in entry) {
      addEditableTags(entry as any, contentType, true);
    }
    
    return entry;
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
    const stack = getStack(); // Get appropriate Stack (delivery or preview)
    
    const query = stack.ContentType(CONTENT_TYPES.PAGE)
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

    // Apply variant header for personalization
    applyVariantHeader(query);

    const result = await query.toJSON().find();
    let pageEntry = result[0]?.[0] as PageEntry || null;
    
    // Enrich banners with fallback images if banner_image is missing
    await enrichBannersWithFallback(pageEntry, targetLocale);
    
    // Fallback to en-us if no page found in selected locale
    if (!pageEntry && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = stack.ContentType(CONTENT_TYPES.PAGE)
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
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && pageEntry) {
      addEditableTags(pageEntry, CONTENT_TYPES.PAGE, true, targetLocale);
    }
    
    // Debug logging
    if (pageEntry) {
    }
    
    return pageEntry;
  } catch (error) {
    console.error(`Error fetching page: ${title}`, error);
    return null;
  }
}


/**
 * Fetch Page entry by URL
 */
export async function getPageByUrl(url: string, locale?: string): Promise<PageEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    const stack = getStack(); // Get appropriate Stack (delivery or preview)
    let pageEntry: PageEntry | null = null;
    
    try {
      const query = stack.ContentType(CONTENT_TYPES.PAGE)
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

      // Apply variant header for personalization
      applyVariantHeader(query);

      const result = await query.toJSON().find();
      pageEntry = result[0]?.[0] as PageEntry || null;
    } catch (localeError) {
      // Fallback to en-us if not found
      if (targetLocale !== FALLBACK_LOCALE) {
        const fallbackQuery = stack.ContentType(CONTENT_TYPES.PAGE)
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
        
        // Enrich banners with fallback images if banner_image is missing (for fallback page)
        await enrichBannersWithFallback(pageEntry, FALLBACK_LOCALE);
      } else {
        throw localeError;
      }
    }
    
    // Enrich banners with fallback images if banner_image is missing (for successfully fetched page)
    await enrichBannersWithFallback(pageEntry, targetLocale);
    
    // If still no page entry, try fallback
    if (!pageEntry && targetLocale !== FALLBACK_LOCALE) {
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
      
      // Enrich banners with fallback images if banner_image is missing (for fallback page)
      await enrichBannersWithFallback(pageEntry, FALLBACK_LOCALE);
      
      // Add Live Preview editable tags if enabled (for fallback page)
      const liveEditFallback = isLiveEditEnabled();
      if (liveEditFallback && pageEntry) {
        addEditableTags(pageEntry, CONTENT_TYPES.PAGE, true, FALLBACK_LOCALE);
      }
    }
    
    // Add Live Preview editable tags if enabled (for successfully fetched page)
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && pageEntry) {
      addEditableTags(pageEntry, CONTENT_TYPES.PAGE, true, targetLocale);
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
    const categories = (result[0] || []) as CategoryEntry[];
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && categories.length > 0) {
      categories.forEach((category) => {
        addEditableTags(category, CONTENT_TYPES.CATEGORY, true);
      });
    }
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories', error);
    return [];
  }
}

// ============================================
// Header Fetch Functions
// ============================================

/**
 * Check if live preview/edit tags should be enabled
 * For server-side rendering, we check environment variables
 * The client-side LivePreviewInitComponent will handle URL params
 */
function isLiveEditEnabled(): boolean {
  // Check environment variables (works on both server and client)
  return process.env.NEXT_PUBLIC_ENABLE_LIVE_PREVIEW === 'true' ||
         process.env.CONTENTSTACK_LIVE_EDIT_TAGS === 'true' ||
         process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true';
}

/**
 * Fetch Header entry by title
 * Header is always fetched in English since it contains non-translatable UI config
 * @param title - "Landing Header" or "App Header"
 */
export async function getHeader(title: string, locale: string = 'en-us'): Promise<HeaderEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.HEADER)
      .Query()
      .where('title', title)
      .includeReference('icon');

    // Always fetch header in English (contains UI configuration, not translated content)
    query.language(locale);


    const result = await query.toJSON().find();
    const header = result[0]?.[0] as HeaderEntry | null;
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && header) {
      addEditableTags(header, 'header', true, locale);
    }
    
    if (header) {
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
    const headers = (result[0] || []) as HeaderEntry[];
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && headers.length > 0) {
      headers.forEach((header) => {
        addEditableTags(header, CONTENT_TYPES.HEADER, true);
      });
    }
    
    return headers;
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
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && footer) {
      addEditableTags(footer, 'footer', true, targetLocale);
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
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && newsletter) {
      addEditableTags(newsletter, CONTENT_TYPES.NEWSLETTER, true, targetLocale);
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
    const banners = (result[0] || []) as BannerEntry[];
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && banners.length > 0) {
      banners.forEach((banner) => {
        addEditableTags(banner, CONTENT_TYPES.BANNER, true);
      });
    }
    
    return banners;
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
    const testimonials = (result[0] || []) as TestimonialEntry[];
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && testimonials.length > 0) {
      testimonials.forEach((testimonial) => {
        addEditableTags(testimonial, CONTENT_TYPES.TESTIMONIAL, true);
      });
    }
    
    return testimonials;
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
export async function getAllCourses(locale?: string, customStack?: any, skipAuthorResolution?: boolean): Promise<CourseEntry[]> {
  try {
    // Use custom Stack if provided (for scripts), otherwise use default Stack
    const stackToUse = customStack || Stack;
    const targetLocale = locale || getCurrentLocale();
    
    // First try with selected locale
    const query = stackToUse.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules']);
    query.language(targetLocale);
    
    const result = await query.toJSON().find();
    let courses = (result[0] || []) as CourseEntry[];
    
    // If no courses found and we're not already using fallback, try fallback locale
    if (courses.length === 0 && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = stackToUse.ContentType(CONTENT_TYPES.COURSE)
        .Query()
        .includeReference(['author', 'modules']);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      courses = (fallbackResult[0] || []) as CourseEntry[];
    }
    
    // Skip author resolution if requested (for sync scripts that don't need full author data)
    if (skipAuthorResolution) {
      return courses;
    }
    
    // Resolve author references for all courses with the target locale
    const resolvedCourses = await Promise.all(
      courses.map(course => resolveAuthorReferences(course, targetLocale))
    );
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && resolvedCourses.length > 0) {
      resolvedCourses.forEach((course) => {
        addEditableTags(course, CONTENT_TYPES.COURSE, true, targetLocale);
      });
    }
    
    return resolvedCourses;
  } catch (error) {
    console.error('Error fetching courses', error);
    return [];
  }
}

/**
 * Fetch all courses by a specific author UID
 * Falls back to English if no content found in selected locale
 */
export async function getCoursesByAuthorUid(authorUid: string, locale?: string): Promise<CourseEntry[]> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First try with selected locale
    const query = Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules']);
    query.language(targetLocale);
    
    const result = await query.toJSON().find();
    let allCourses = (result[0] || []) as CourseEntry[];
    
    // If no courses found and we're not already using fallback, try fallback locale
    if (allCourses.length === 0 && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.COURSE)
        .Query()
        .includeReference(['author', 'modules']);
      fallbackQuery.language(FALLBACK_LOCALE);
      
      const fallbackResult = await fallbackQuery.toJSON().find();
      allCourses = (fallbackResult[0] || []) as CourseEntry[];
    }
    
    // Filter courses by author UID
    const authorCourses = allCourses.filter(course => {
      const authors = Array.isArray(course.author) ? course.author : course.author ? [course.author] : [];
      return authors.some(author => author.uid === authorUid);
    });
    
    // Resolve author references for filtered courses
    const resolvedCourses = await Promise.all(
      authorCourses.map(course => resolveAuthorReferences(course, targetLocale))
    );
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && resolvedCourses.length > 0) {
      resolvedCourses.forEach((course) => {
        addEditableTags(course, CONTENT_TYPES.COURSE, true, targetLocale);
      });
    }
    
    return resolvedCourses;
  } catch (error) {
    console.error(`Error fetching courses by author UID: ${authorUid}`, error);
    return [];
  }
}

/**
 * Fetch author by UID - fetches in the specified locale, falls back to default locale if not found
 */
async function getAuthorByUid(uid: string, locale?: string): Promise<AuthorEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    // First try with selected locale
  try {
    const query = Stack.ContentType(CONTENT_TYPES.AUTHOR)
      .Entry(uid);
      query.language(targetLocale);
    
    const result = await query.toJSON().fetch();
    return result as AuthorEntry;
    } catch (localeError) {
      // If locale fetch fails and we're not already using fallback, try fallback
      if (targetLocale !== FALLBACK_LOCALE) {
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.AUTHOR)
          .Entry(uid);
        fallbackQuery.language(FALLBACK_LOCALE);
        
        const fallbackResult = await fallbackQuery.toJSON().fetch();
        return fallbackResult as AuthorEntry;
      } else {
        throw localeError;
      }
    }
  } catch (error) {
    console.error(`Error fetching author by UID: ${uid}`, error);
    return null;
  }
}

/**
 * Helper to resolve author references that may not be fully populated
 * Fetches author data in the specified locale, falls back to default locale if not found
 */
async function resolveAuthorReferences(course: CourseEntry, locale?: string): Promise<CourseEntry> {
  if (!course.author) return course;
  
  const authors = Array.isArray(course.author) ? course.author : [course.author];
  const resolvedAuthors: AuthorEntry[] = [];
  
  for (const author of authors) {
    // Fetch author data in the specified locale to get localized bio/description
    if (author.uid) {
      // Fetch fresh author data in the target locale
      const fullAuthor = await getAuthorByUid(author.uid, locale);
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
        const localizedCourse = await getCourseByUid(fallbackCourse.uid, targetLocale);
        course = localizedCourse || fallbackCourse;
      }
    }
    
    // Ensure author references are fully resolved with the target locale
    if (course) {
      course = await resolveAuthorReferences(course, targetLocale);
      
      // Add Live Preview editable tags if enabled
      const liveEdit = isLiveEditEnabled();
      if (liveEdit) {
        addEditableTags(course, CONTENT_TYPES.COURSE, true, targetLocale);
      }
      
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
    
    // Ensure author references are fully resolved with the target locale
    if (course) {
      course = await resolveAuthorReferences(course, targetLocale);
      
      // Add Live Preview editable tags if enabled
      const liveEdit = isLiveEditEnabled();
      if (liveEdit) {
        addEditableTags(course, CONTENT_TYPES.COURSE, true, targetLocale);
      }
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
    const module = result as ModuleEntry;
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && module) {
      addEditableTags(module, CONTENT_TYPES.MODULE, true);
    }
    
    return module;
  } catch (error) {
    console.error(`Error fetching module by UID: ${uid}`, error);
    return null;
  }
}

// ============================================
// Lesson Fetch Functions
// ============================================

/**
 * Fetch a single lesson by UID with fallback for non-localized resources
 */
export async function getLessonByUid(uid: string, locale?: string): Promise<LessonEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const entry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
    entry.language(targetLocale);
    
    let result = await entry.toJSON().fetch() as LessonEntry | null;
    
    // Check if video_url or other non-localized resources are missing
    const hasVideoUrl = result?.video_url?.href || 
                       (typeof result?.video_url === 'string' && result.video_url) ||
                       (result as any)?.video_link?.href;
    
    // If lesson found but missing video_url, try to get it from fallback locale
    if (result && !hasVideoUrl && targetLocale !== FALLBACK_LOCALE) {
      try {
        const fallbackEntry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
        fallbackEntry.language(FALLBACK_LOCALE);
        const fallbackResult = await fallbackEntry.toJSON().fetch() as LessonEntry | null;
        
        // Merge fallback video_url into current result if it exists
        if (fallbackResult) {
          const fallbackVideoUrl = fallbackResult.video_url?.href || 
                                  (typeof fallbackResult.video_url === 'string' ? fallbackResult.video_url : null) ||
                                  (fallbackResult as any)?.video_link?.href;
          
          if (fallbackVideoUrl) {
            // Merge video_url from fallback into result
            result = {
              ...result,
              video_url: fallbackResult.video_url || result.video_url,
            } as LessonEntry;
          }
        }
      } catch (fallbackError) {
      }
    }
    
    // If not found at all, try fallback locale
    if (!result && targetLocale !== FALLBACK_LOCALE) {
      const fallbackEntry = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
      fallbackEntry.language(FALLBACK_LOCALE);
      result = await fallbackEntry.toJSON().fetch() as LessonEntry | null;
    }
    
    // Add Live Preview editable tags if enabled
    const liveEdit = isLiveEditEnabled();
    if (liveEdit && result) {
      addEditableTags(result, CONTENT_TYPES.LESSON, true, targetLocale);
    }
    
    return result;
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
        // Resolve author references for the matching course with the target locale
        const resolvedCourse = await resolveAuthorReferences(course, targetLocale);
        
        // Add Live Preview editable tags if enabled
        const liveEdit = isLiveEditEnabled();
        if (liveEdit && resolvedCourse) {
          addEditableTags(resolvedCourse, CONTENT_TYPES.COURSE, true, targetLocale);
        }
        
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
          // Add Live Preview editable tags if enabled
          const liveEdit = isLiveEditEnabled();
          if (liveEdit && onboardingEntries.length > 0) {
            onboardingEntries.forEach((entry) => {
              addEditableTags(entry, CONTENT_TYPES.ONBOARDING, true);
            });
          }
          
          return onboardingEntries.sort((a, b) => a.current_step - b.current_step);
        }
      }
    } catch (error: any) {
      // Log the error but continue trying other content types
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
    }
  } catch (error) {
    console.error('Error searching for onboarding page:', error);
  }

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

// ============================================
// Personalize Variant Management
// ============================================

let currentVariantUid: string | null = null;

/**
 * Set the current Personalize variant UID for use in API calls
 */
export function setPersonalizeVariant(variantUid: string | null): void {
  currentVariantUid = variantUid;
  
  // Try to set header globally on Stack instance if possible
  if (variantUid && Stack) {
    try {
      // Try different methods to set header globally
      if (typeof (Stack as any).setHeader === 'function') {
        (Stack as any).setHeader('x-cs-variant-uid', variantUid);
      } else if (typeof (Stack as any).addHeader === 'function') {
        (Stack as any).addHeader('x-cs-variant-uid', variantUid);
      } else if ((Stack as any).headers) {
        (Stack as any).headers['x-cs-variant-uid'] = variantUid;
      } else {
      }
    } catch (error) {
    }
  } else if (!variantUid && Stack) {
    // Clear header if variant is null
    try {
      if ((Stack as any).headers && (Stack as any).headers['x-cs-variant-uid']) {
        delete (Stack as any).headers['x-cs-variant-uid'];
      }
    } catch (error) {
      // Ignore errors when clearing
    }
  }
}

/**
 * Get the current Personalize variant UID
 */
export function getPersonalizeVariant(): string | null {
  return currentVariantUid;
}

/**
 * Get variant headers for API calls
 * Returns headers object with x-cs-variant-uid if variant is set
 */
export function getVariantHeaders(): Record<string, string> {
  if (currentVariantUid) {
    return {
      'x-cs-variant-uid': currentVariantUid
    };
  }
  return {};
}

/**
 * Apply variant header to Contentstack query if variant is set
 * This ensures personalized content is fetched based on the variant
 */
function applyVariantHeader(query: any): void {
  if (currentVariantUid) {
    try {
      // Contentstack SDK supports addHeader method on queries
      if (typeof query.addHeader === 'function') {
        query.addHeader('x-cs-variant-uid', currentVariantUid);
      } else if (typeof query.setHeader === 'function') {
        query.setHeader('x-cs-variant-uid', currentVariantUid);
      } else if (query && typeof query.addParam === 'function') {
        // Some SDK versions use addParam for headers
        query.addParam('x-cs-variant-uid', currentVariantUid);
      } else {
        // Try to set headers on the Stack instance globally
        if (Stack && typeof (Stack as any).setHeader === 'function') {
          (Stack as any).setHeader('x-cs-variant-uid', currentVariantUid);
        } else if (Stack && typeof (Stack as any).addHeader === 'function') {
          (Stack as any).addHeader('x-cs-variant-uid', currentVariantUid);
        } else {
          // Last resort: try to modify the query's internal headers
          try {
            if (query && query.headers) {
              query.headers['x-cs-variant-uid'] = currentVariantUid;
            }
          } catch (e) {
            // Could not apply variant header - continue without it
          }
        }
      }
    } catch (error) {
      console.error('[Contentstack] ❌ Error applying variant header:', error);
    }
  }
}

// Export the Stack for advanced usage
export { Stack };

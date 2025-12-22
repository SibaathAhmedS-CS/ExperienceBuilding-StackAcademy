import Contentstack from 'contentstack';
import { 
  HeaderEntry, 
  FooterEntry, 
  NewsletterEntry, 
  FAQEntry,
  PageEntry,
  BannerEntry,
  TestimonialEntry,
  HeroBlockEntry
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
  COURSE: 'course',
  MODULE: 'module',
  CATEGORY: 'category',
  INSTRUCTOR: 'instructor',
} as const;

// ============================================
// Generic Fetch Helpers
// ============================================

/**
 * Fetch single entry by content type and UID
 */
export async function getEntry<T = ContentstackEntry>(
  contentType: string,
  entryUid: string,
  referenceFields: string[] = []
): Promise<T | null> {
  try {
    const query = Stack.ContentType(contentType).Entry(entryUid);
    
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
    orderDirection?: 'asc' | 'desc';
    where?: Record<string, any>;
  } = {}
): Promise<T[]> {
  try {
    const query = Stack.ContentType(contentType).Query();
    
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
 */
export async function getPage(title: string): Promise<PageEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.PAGE)
      .Query()
      .where('title', title)
      .includeReference([
        'header',
        'header.icon',
        'section.hero_block.hero_banner',
        'section.carousel_block.banner',
        'section.category_block.icon',
        'section.feature_block.features',
        'section.workflow_block.stage',
        'section.testimonial_block.testimonial',
        'section.testimonial_block.testimonial.author',
      ]);

    const result = await query.toJSON().find();
    return result[0]?.[0] as PageEntry || null;
  } catch (error) {
    console.error(`Error fetching page: ${title}`, error);
    return null;
  }
}

/**
 * Fetch Page entry by URL
 */
export async function getPageByUrl(url: string): Promise<PageEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.PAGE)
      .Query()
      .where('url', url)
      .includeReference([
        'header',
        'header.icon',
        'section.carousel_block.banner',
        'section.category_block.icon',
        'section.feature_block.features',
        'section.workflow_block.stage',
        'section.testimonial_block.testimonial',
        'section.testimonial_block.testimonial.author',
      ]);

    const result = await query.toJSON().find();
    return result[0]?.[0] as PageEntry || null;
  } catch (error) {
    console.error(`Error fetching page by URL: ${url}`, error);
    return null;
  }
}

// ============================================
// Header Fetch Functions
// ============================================

/**
 * Fetch Header entry by title
 * @param title - "Landing Header" or "App Header"
 */
export async function getHeader(title: string): Promise<HeaderEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.HEADER)
      .Query()
      .where('title', title)
      .includeReference('icon');

    const result = await query.toJSON().find();
    return result[0]?.[0] as HeaderEntry || null;
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
 */
export async function getFooter(): Promise<FooterEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.FOOTER)
      .Query()
      .includeReference('icon');

    const result = await query.toJSON().find();
    return result[0]?.[0] as FooterEntry || null;
  } catch (error) {
    console.error('Error fetching footer', error);
    return null;
  }
}

/**
 * Fetch Newsletter entry (singleton)
 */
export async function getNewsletter(): Promise<NewsletterEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.NEWSLETTER)
      .Query()
      .includeReference('icon');

    const result = await query.toJSON().find();
    return result[0]?.[0] as NewsletterEntry || null;
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
 */
export async function getFAQ(): Promise<FAQEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.FAQ)
      .Query()
      .includeReference(['icon', 'faq_question']);

    const result = await query.toJSON().find();
    const faqEntry = result[0]?.[0] as FAQEntry || null;
    
    if (faqEntry) {
      console.log('FAQ Entry fetched:', {
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

// Export the Stack for advanced usage
export { Stack };

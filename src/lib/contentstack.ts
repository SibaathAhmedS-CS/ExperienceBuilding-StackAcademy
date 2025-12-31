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
  AuthBrandingEntry
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
        'section.hero_block.hero_banner',        // Hero Banner reference
        'section.carousel_block.banner',          // Banner references for carousel
        'section.category_block.icon',            // Legacy category icons
        'section.category_block.category',        // New category references (categories_block)
        'section.feature_block.features',         // Feature icons
        'section.workflow_block.stage',           // Workflow stage icons
        'section.testimonial_block.testimonial',  // Testimonial entries
        'section.testimonial_block.testimonial.author', // Testimonial authors
      ]);

    const result = await query.toJSON().find();
    const pageEntry = result[0]?.[0] as PageEntry || null;
    
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
        'section.category_block.category',        // New category references
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

// ============================================
// Course Fetch Functions
// ============================================

/**
 * Fetch all courses with author reference
 */
export async function getAllCourses(): Promise<CourseEntry[]> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules'])
      .toJSON()
      .find();
    return (result[0] || []) as CourseEntry[];
  } catch (error) {
    console.error('Error fetching courses', error);
    return [];
  }
}

/**
 * Fetch a single course by slug with all nested references
 */
export async function getCourseBySlug(slug: string): Promise<CourseEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .where('slug', slug)
      .includeReference([
        'author',
        'modules',
        'modules.lessons'
      ]);

    const result = await query.toJSON().find();
    const course = result[0]?.[0] as CourseEntry || null;
    
    if (course) {
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
 */
export async function getCourseByUid(uid: string): Promise<CourseEntry | null> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.COURSE)
      .Entry(uid)
      .includeReference([
        'author',
        'modules',
        'modules.lessons'
      ])
      .toJSON()
      .fetch();
    return result as CourseEntry;
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
export async function getLessonByUid(uid: string): Promise<LessonEntry | null> {
  try {
    const result = await Stack.ContentType(CONTENT_TYPES.LESSON)
      .Entry(uid)
      .toJSON()
      .fetch();
    return result as LessonEntry;
  } catch (error) {
    console.error(`Error fetching lesson by UID: ${uid}`, error);
    return null;
  }
}

/**
 * Fetch a single lesson by slug
 */
export async function getLessonBySlug(slug: string): Promise<LessonEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.LESSON)
      .Query()
      .where('slug', slug);

    const result = await query.toJSON().find();
    return result[0]?.[0] as LessonEntry || null;
  } catch (error) {
    console.error(`Error fetching lesson by slug: ${slug}`, error);
    return null;
  }
}

/**
 * Fetch course data for a given lesson (to get course context)
 * Returns the course that contains this lesson
 */
export async function getCourseByLessonUid(lessonUid: string): Promise<CourseEntry | null> {
  try {
    // First, find which module contains this lesson
    const modulesResult = await Stack.ContentType(CONTENT_TYPES.MODULE)
      .Query()
      .includeReference(['lessons'])
      .toJSON()
      .find();
    
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
    const coursesResult = await Stack.ContentType(CONTENT_TYPES.COURSE)
      .Query()
      .includeReference(['author', 'modules', 'modules.lessons'])
      .toJSON()
      .find();
    
    const courses = (coursesResult[0] || []) as CourseEntry[];
    
    for (const course of courses) {
      const courseModules = Array.isArray(course.modules) ? course.modules : course.modules ? [course.modules] : [];
      if (courseModules.some(m => m.uid === targetModuleUid)) {
        return course;
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
      let query = Stack.ContentType(contentType).Query();
      
      // If it's modular_section, filter for onboarding entries
      if (contentType === 'modular_section') {
        query = query.where('title', 'Onboarding Step');
      } else {
        // For onboarding-specific content types, include option references
        query = query.includeReference('option');
      }
      
      query = query.ascending('current_step');  // Sort by step number

      const result = await query.toJSON().find();
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

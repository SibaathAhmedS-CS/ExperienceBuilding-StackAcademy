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
 * Fetch FAQ question entry by UID
 * Helper function to manually resolve faq_question references
 */
async function getFAQQuestionByUid(uid: string, locale: string): Promise<any | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.FAQ_QUESTION).Entry(uid);
    query.language(locale);
    const result = await query.toJSON().fetch();
    return result;
  } catch (error) {
    // Try fallback locale
    if (locale !== FALLBACK_LOCALE) {
      try {
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.FAQ_QUESTION).Entry(uid);
        fallbackQuery.language(FALLBACK_LOCALE);
        const fallbackResult = await fallbackQuery.toJSON().fetch();
        return fallbackResult;
      } catch {
        // Ignore fallback error
      }
    }
    return null;
  }
}

/**
 * Fetch FAQ entry (singleton) with nested references
 * Supports locale for fetching localized content
 * Manually resolves faq_question reference if not expanded
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
    
    // Manually resolve faq_question if not expanded (happens for localized entries)
    if (faqEntry && faqEntry.faq_question) {
      const faqQuestions = Array.isArray(faqEntry.faq_question) 
        ? faqEntry.faq_question 
        : [faqEntry.faq_question];
      
      // Check if questions need to be resolved (only have uid, no questions array)
      const needsResolution = faqQuestions.some(q => 
        q.uid && (!q.questions || q.questions.length === 0)
      );
      
      if (needsResolution) {
        console.log(`[CMS] FAQ references not expanded, manually resolving for ${targetLocale}...`);
        const resolvedQuestions = await Promise.all(
          faqQuestions.map(async (q) => {
            if (q.uid && (!q.questions || q.questions.length === 0)) {
              const resolved = await getFAQQuestionByUid(q.uid, targetLocale);
              return resolved || q;
            }
            return q;
          })
        );
        faqEntry.faq_question = resolvedQuestions;
      }
    }
    
    if (faqEntry) {
      const questions = Array.isArray(faqEntry.faq_question) 
        ? faqEntry.faq_question 
        : faqEntry.faq_question ? [faqEntry.faq_question] : [];
      const firstQ = questions[0];
      
      console.log(`[CMS] FAQ Entry fetched (${targetLocale}):`, {
        title: faqEntry.section_title,
        hasIcon: !!faqEntry.icon,
        questionsResolved: firstQ?.questions?.length || 0,
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
    
    // Ensure author and module references are fully resolved
    if (course) {
      course = await resolveAuthorReferences(course);
      course = await resolveModuleReferences(course, targetLocale);
      
      const moduleCount = Array.isArray(course.modules) ? course.modules.length : course.modules ? 1 : 0;
      const lessonCount = (Array.isArray(course.modules) ? course.modules : course.modules ? [course.modules] : [])
        .reduce((acc, m) => acc + (Array.isArray(m.lessons) ? m.lessons.length : m.lessons ? 1 : 0), 0);
      console.log(`[CMS] Course "${course.title}" loaded with ${moduleCount} modules, ${lessonCount} lessons (${targetLocale})`);
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
    
    // Ensure author and module references are fully resolved
    if (course) {
      course = await resolveAuthorReferences(course);
      course = await resolveModuleReferences(course, targetLocale);
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
 * Fetch a single lesson by UID (internal helper for resolving references)
 */
async function fetchLessonByUid(uid: string, locale: string): Promise<LessonEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
    query.language(locale);
    const result = await query.toJSON().fetch();
    return result as LessonEntry;
  } catch (error) {
    // Try fallback locale
    if (locale !== FALLBACK_LOCALE) {
      try {
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.LESSON).Entry(uid);
        fallbackQuery.language(FALLBACK_LOCALE);
        const fallbackResult = await fallbackQuery.toJSON().fetch();
        return fallbackResult as LessonEntry;
      } catch {
        // Ignore fallback error
      }
    }
    return null;
  }
}

/**
 * Fetch a single module by UID (internal helper for resolving references)
 */
async function fetchModuleByUid(uid: string, locale: string): Promise<ModuleEntry | null> {
  try {
    const query = Stack.ContentType(CONTENT_TYPES.MODULE).Entry(uid);
    query.language(locale);
    query.includeReference(['lessons']);
    const result = await query.toJSON().fetch();
    return result as ModuleEntry;
  } catch (error) {
    // Try fallback locale
    if (locale !== FALLBACK_LOCALE) {
      try {
        const fallbackQuery = Stack.ContentType(CONTENT_TYPES.MODULE).Entry(uid);
        fallbackQuery.language(FALLBACK_LOCALE);
        fallbackQuery.includeReference(['lessons']);
        const fallbackResult = await fallbackQuery.toJSON().fetch();
        return fallbackResult as ModuleEntry;
      } catch {
        // Ignore fallback error
      }
    }
    return null;
  }
}

/**
 * Resolve lesson references within a module
 * Handles cases where includeReference doesn't properly expand localized references
 */
async function resolveLessonReferences(module: ModuleEntry, locale: string): Promise<ModuleEntry> {
  if (!module.lessons) return module;
  
  const lessons = Array.isArray(module.lessons) ? module.lessons : [module.lessons];
  
  // Check if lessons need to be resolved (only have uid, no title/content)
  const needsResolution = lessons.some(l => 
    l.uid && (!l.title || l.title === '')
  );
  
  if (needsResolution) {
    console.log(`[CMS] Module "${module.title}" lessons not expanded, manually resolving for ${locale}...`);
    const resolvedLessons = await Promise.all(
      lessons.map(async (lesson) => {
        if (lesson.uid && (!lesson.title || lesson.title === '')) {
          const resolved = await fetchLessonByUid(lesson.uid, locale);
          return resolved || lesson;
        }
        return lesson;
      })
    );
    module.lessons = resolvedLessons as LessonEntry[];
  }
  
  return module;
}

/**
 * Resolve module references within a course
 * Handles cases where includeReference doesn't properly expand localized references
 */
async function resolveModuleReferences(course: CourseEntry, locale: string): Promise<CourseEntry> {
  if (!course.modules) return course;
  
  const modules = Array.isArray(course.modules) ? course.modules : [course.modules];
  
  // Check if modules need to be resolved (only have uid, no title)
  const needsResolution = modules.some(m => 
    m.uid && (!m.title || m.title === '')
  );
  
  if (needsResolution) {
    console.log(`[CMS] Course "${course.title}" modules not expanded, manually resolving for ${locale}...`);
    const resolvedModules = await Promise.all(
      modules.map(async (module) => {
        if (module.uid && (!module.title || module.title === '')) {
          const resolved = await fetchModuleByUid(module.uid, locale);
          if (resolved) {
            // Also resolve lessons within this module
            return await resolveLessonReferences(resolved, locale);
          }
          return module;
        }
        // If module is already resolved, still check lessons
        return await resolveLessonReferences(module, locale);
      })
    );
    course.modules = resolvedModules as ModuleEntry[];
  } else {
    // Modules are resolved, but check if their lessons need resolution
    const modulesWithResolvedLessons = await Promise.all(
      modules.map(async (module) => {
        return await resolveLessonReferences(module, locale);
      })
    );
    course.modules = modulesWithResolvedLessons as ModuleEntry[];
  }
  
  return course;
}

/**
 * Fetch a single module by UID with lessons
 */
export async function getModuleByUid(uid: string, locale?: string): Promise<ModuleEntry | null> {
  try {
    const targetLocale = locale || getCurrentLocale();
    
    const query = Stack.ContentType(CONTENT_TYPES.MODULE)
      .Entry(uid)
      .includeReference(['lessons']);
    query.language(targetLocale);
    
    let result = await query.toJSON().fetch();
    let module = result as ModuleEntry;
    
    // Fallback to en-us if not found
    if (!module && targetLocale !== FALLBACK_LOCALE) {
      const fallbackQuery = Stack.ContentType(CONTENT_TYPES.MODULE)
        .Entry(uid)
        .includeReference(['lessons']);
      fallbackQuery.language(FALLBACK_LOCALE);
      result = await fallbackQuery.toJSON().fetch();
      module = result as ModuleEntry;
    }
    
    // Resolve lesson references if needed
    if (module) {
      module = await resolveLessonReferences(module, targetLocale);
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
        // Resolve author and module references for the matching course
        let resolvedCourse = await resolveAuthorReferences(course);
        resolvedCourse = await resolveModuleReferences(resolvedCourse, targetLocale);
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

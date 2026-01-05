'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Carousel from '@/components/Carousel';
import CourseCard from '@/components/CourseCard';
import CategoryCard from '@/components/CategoryCard';
import FAQ from '@/components/FAQ';
import { useHeader } from '@/hooks/useHeader';
import { usePage } from '@/hooks/usePage';
import { useCourses, transformCourseToCard, TransformedCourse } from '@/hooks/useCourses';
import { syncPreferencesToLytics } from '@/services/preferenceTracking';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { 
  PageEntry, 
  IconEntry, 
  BannerEntry,
  CategoryEntry,
  CourseQuery,
  Link as CMSLink,
  isCarouselBlock, 
  isCategoryBlock,
  isCardBlock,
  normalizeArray 
} from '@/types/contentstack';
import styles from './page.module.css';

// Mock user data - Replace with actual auth
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// Fallback banner data
const fallbackBanners = [
  {
    uid: '1',
    title: 'Master Full-Stack Development',
    description: 'Learn to build complete web applications from scratch with our comprehensive bootcamp. Start your journey today!',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    ctaLabel: 'Start Learning',
    ctaUrl: '/course/fullstack-bootcamp',
    backgroundColor: '#3b82f6',
  },
  {
    uid: '2',
    title: 'AWS Cloud Certification',
    description: 'Get certified and boost your career. Learn cloud computing from industry experts!',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    ctaLabel: 'Enroll Now',
    ctaUrl: '/course/aws-certification',
    backgroundColor: '#7c3aed',
  },
  {
    uid: '3',
    title: 'Data Science with Python',
    description: 'Unlock the power of data. Master machine learning, AI, and analytics with hands-on projects.',
    image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
    ctaLabel: 'Start Learning',
    ctaUrl: '/course/data-science-python',
    backgroundColor: '#059669',
  },
];

// Fallback categories
const fallbackCategories = [
  { uid: '1', title: 'Development', slug: 'development', icon: 'code', courseCount: 350 },
  { uid: '2', title: 'Business', slug: 'business', icon: 'briefcase', courseCount: 180 },
  { uid: '3', title: 'Design', slug: 'design', icon: 'palette', courseCount: 145 },
  { uid: '4', title: 'Data Science', slug: 'data-science', icon: 'chart', courseCount: 120 },
  { uid: '5', title: 'Cloud Computing', slug: 'cloud', icon: 'cloud', courseCount: 95 },
  { uid: '6', title: 'Cybersecurity', slug: 'security', icon: 'shield', courseCount: 78 },
  { uid: '7', title: 'Mobile Apps', slug: 'mobile', icon: 'smartphone', courseCount: 85 },
  { uid: '8', title: 'AI & ML', slug: 'ai-ml', icon: 'brain', courseCount: 110 },
];

// Fallback courses data - Using real CMS course slugs
const topCourses = [
  {
    uid: 'blt6139b873994abedc',
    title: 'Machine Learning with Python',
    slug: 'machine-learning-python',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600',
    instructorName: 'Michael Chen',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.8,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'AI & ML',
    isFeatured: true,
  },
  {
    uid: 'blte66355d66dec039d',
    title: 'Complete React Developer Course',
    slug: 'react-developer-course',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructorName: 'Sarah Johnson',
    level: 'beginner' as const,
    duration: '42 hours',
    rating: 4.9,
    reviewsCount: 15600,
    studentsEnrolled: 68000,
    category: 'Development',
    isPopular: true,
  },
  {
    uid: 'blte671205ef0de57c1',
    title: 'AWS Cloud Practitioner',
    slug: 'aws-cloud-practitioner',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    instructorName: 'David Park',
    level: 'intermediate' as const,
    duration: '45 hours',
    rating: 4.9,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'Cloud',
  },
  {
    uid: 'bltd97014c9501ad853',
    title: 'UX/UI Design Fundamentals',
    slug: 'ux-ui-design-fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600',
    instructorName: 'Emma Wilson',
    level: 'beginner' as const,
    duration: '35 hours',
    rating: 4.7,
    reviewsCount: 6800,
    studentsEnrolled: 24000,
    category: 'Design',
  },
];

const recommendedCourses = [
  {
    uid: 'bltc50b57b3e30df2ff',
    title: 'Node.js Backend Masterclass',
    slug: 'nodejs-backend-masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600',
    instructorName: 'Alex Rivera',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.8,
    reviewsCount: 9200,
    studentsEnrolled: 35000,
    category: 'Development',
  },
  {
    uid: 'blt71c92f2be109835e',
    title: 'Docker and Kubernetes Mastery',
    slug: 'docker-kubernetes-mastery',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600',
    instructorName: 'James Liu',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.9,
    reviewsCount: 4500,
    studentsEnrolled: 15000,
    category: 'DevOps',
  },
  {
    uid: 'bltab2bba525506ec98',
    title: 'Python for Data Science',
    slug: 'python-data-science',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Priya Sharma',
    level: 'beginner' as const,
    duration: '40 hours',
    rating: 4.7,
    reviewsCount: 7800,
    studentsEnrolled: 42000,
    category: 'Data Science',
  },
  {
    uid: 'bltda7ebfbc6896546e',
    title: 'Cybersecurity Essentials',
    slug: 'cybersecurity-essentials',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
    instructorName: 'Ryan Martinez',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.8,
    reviewsCount: 11200,
    studentsEnrolled: 38000,
    category: 'Security',
  },
];

const categoryCourses: Record<string, typeof topCourses> = {
  development: topCourses.filter(c => c.category === 'Development'),
  'data-science': topCourses.filter(c => c.category === 'Data Science'),
  cloud: topCourses.filter(c => c.category === 'Cloud'),
  design: topCourses.filter(c => c.category === 'Design'),
};

const fallbackFaqs = [
  { uid: '1', question: 'How do I enroll in a course?', answer: 'Simply browse our catalog, click on any course you\'re interested in, and click the "Start Learning" button to begin.' },
  { uid: '2', question: 'Can I download courses for offline viewing?', answer: 'Yes! Our mobile app allows you to download course content for offline viewing. This feature is available for all enrolled courses.' },
  { uid: '3', question: 'How do I get support if I am stuck?', answer: 'You can use the Q&A section in each course to ask questions, join our community forums, or contact our support team directly through the help center.' },
  { uid: '4', question: 'Do I get a certificate after completing a course?', answer: 'Yes! Upon completion of any course, you receive a verified certificate that you can share on LinkedIn and add to your resume.' },
];

// Card block types for mapping course sections
type CardBlockType = 'top_courses' | 'recommended' | 'unknown';

// Card block data with CTA and query for personalization
interface CardBlockData {
  type: CardBlockType;
  title: string;
  description: string;
  ctaButton?: CMSLink;
  query?: CourseQuery;  // Query parameters for filtering courses
}

// Helper to extract data from page sections
function extractHomePageData(pageData: PageEntry | null) {
  if (!pageData?.section) return null;

  let banners: BannerEntry[] = [];
  let categories: CategoryEntry[] = [];
  let legacyCategories: IconEntry[] = [];
  let carouselSettings = { interval: 5000, autoplay: true };
  let categoriesTitle = { title: '', description: '' };
  
  // Card blocks for course sections
  const cardBlocks: CardBlockData[] = [];

  for (const section of pageData.section) {
    if (isCarouselBlock(section)) {
      banners = normalizeArray(section.carousel_block.banner);
      // CMS stores interval in milliseconds (e.g., 6000), but check if it's small (seconds)
      const rawInterval = section.carousel_block.interval || 5000;
      const intervalMs = rawInterval < 100 ? rawInterval * 1000 : rawInterval;
      carouselSettings = {
        interval: intervalMs,
        autoplay: section.carousel_block.autoplay ?? true,
      };
    }
    if (isCategoryBlock(section)) {
      // Check for new category reference first, fallback to legacy icon
      categories = normalizeArray(section.category_block.category);
      legacyCategories = normalizeArray(section.category_block.icon);
      categoriesTitle = {
        title: section.category_block.title_and_description?.title || '',
        description: section.category_block.title_and_description?.description || '',
      };
    }
    if (isCardBlock(section)) {
      const title = section.card_block.title_and_description?.title || '';
      const description = section.card_block.title_and_description?.description || '';
      const ctaButton = section.card_block.cta_button;
      const query = section.card_block.query;
      
      // Determine card block type based on order (first = top_courses, second = recommended)
      const type: CardBlockType = cardBlocks.length === 0 ? 'top_courses' : 'recommended';
      
      if (query) {
        console.log(`Card Block "${title}" query:`, query);
      }
      
      cardBlocks.push({ type, title, description, ctaButton, query });
    }
  }

  return { banners, categories, legacyCategories, carouselSettings, categoriesTitle, cardBlocks };
}

/**
 * Filter courses based on query parameters from card blocks
 * Matches courses by title keywords, difficulty, and duration
 * Falls back to other courses if not enough matches
 */
function filterCoursesByQuery(
  courses: TransformedCourse[],
  query?: CourseQuery,
  excludeUids: string[] = []
): TransformedCourse[] {
  // If no query, return first 4 courses excluding already shown ones
  if (!query || (!query.titles && !query.difficulty && !query.duration)) {
    return courses.filter(c => !excludeUids.includes(c.uid)).slice(0, 4);
  }

  // Parse title keywords
  const keywords = query.titles
    ?.split(',')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0) || [];

  // Difficulty mapping
  const difficultyMap: Record<string, string> = {
    'Beginner': 'beginner',
    'Intermediate': 'intermediate',
    'Advanced': 'advanced',
  };

  // Find matching courses
  const matchingCourses = courses.filter(course => {
    // Exclude already shown courses
    if (excludeUids.includes(course.uid)) return false;

    // Check title keywords (if any keyword matches)
    if (keywords.length > 0) {
      const titleLower = course.title.toLowerCase();
      const categoryLower = (course.category || '').toLowerCase();
      const hasKeywordMatch = keywords.some(kw => 
        titleLower.includes(kw) || categoryLower.includes(kw)
      );
      if (!hasKeywordMatch) return false;
    }

    // Check difficulty (if specified)
    if (query.difficulty) {
      if (course.level !== difficultyMap[query.difficulty]) return false;
    }

    // Check duration (max hours, if specified)
    if (query.duration) {
      const courseDuration = parseInt(course.duration) || 0;
      if (courseDuration > query.duration) return false;
    }

    return true;
  });

  // If we have 4+ matching courses, return them
  if (matchingCourses.length >= 4) {
    return matchingCourses.slice(0, 4);
  }

  // Otherwise, fill remaining slots with other courses (not excluded, not already in matching)
  const matchingUids = new Set(matchingCourses.map(c => c.uid));
  const fillerCourses = courses.filter(c => 
    !excludeUids.includes(c.uid) && !matchingUids.has(c.uid)
  );

  // Return matching courses first, then fillers to make 4 total
  return [...matchingCourses, ...fillerCourses].slice(0, 4);
}

export default function HomePage() {
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');
  
  // Fetch page data from Contentstack
  const { pageData, isLoading } = usePage('Home Page');
  
  // Fetch courses from CMS
  const { courses: cmsCourses, isLoading: coursesLoading } = useCourses();
  
  // Extract section data from CMS
  const homeData = extractHomePageData(pageData);
  
  // Get card blocks with queries
  const cardBlocks = homeData?.cardBlocks || [];
  const topCoursesBlock = cardBlocks[0]; // First card block
  const recommendedBlock = cardBlocks[1]; // Second card block

  // Transform CMS courses to card format (memoized)
  const transformedCourses = useMemo(() => 
    cmsCourses.map(transformCourseToCard),
    [cmsCourses]
  );

  // Filter courses for Section 1 (Top Rated) using query from variant
  const topCoursesFiltered = useMemo(() => {
    if (transformedCourses.length === 0) return topCourses; // Fallback to mock data
    const filtered = filterCoursesByQuery(transformedCourses, topCoursesBlock?.query);
    
    // Debug logging for personalization
    if (topCoursesBlock?.query) {
      console.log('[Personalization] Section 1 Query:', topCoursesBlock.query);
      console.log('[Personalization] Section 1 Courses:', filtered.map(c => c.title));
    }
    
    return filtered;
  }, [transformedCourses, topCoursesBlock?.query]);

  // Filter courses for Section 2 (Recommended) using query, excluding Section 1 courses
  const recommendedCoursesFiltered = useMemo(() => {
    if (transformedCourses.length === 0) return recommendedCourses; // Fallback to mock data
    const section1Uids = topCoursesFiltered.map(c => c.uid);
    const filtered = filterCoursesByQuery(transformedCourses, recommendedBlock?.query, section1Uids);
    
    // Debug logging for personalization
    if (recommendedBlock?.query) {
      console.log('[Personalization] Section 2 Query:', recommendedBlock.query);
      console.log('[Personalization] Section 2 Courses:', filtered.map(c => c.title));
    }
    
    return filtered;
  }, [transformedCourses, recommendedBlock?.query, topCoursesFiltered]);

  // Legacy variables for backwards compatibility
  const cmsTopCourses = topCoursesFiltered;
  const cmsRecommendedCourses = recommendedCoursesFiltered;

  // Determine what data to use
  const hasCMSBanners = homeData && homeData.banners.length > 0;
  const hasCMSCategories = homeData && (homeData.categories.length > 0 || homeData.legacyCategories.length > 0);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check for Supabase user session and sync preferences to Lytics
    const checkUserAndSyncPreferences = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error || !authUser) {
          // No authenticated user - redirect to login
          router.push('/login');
          return;
        }

        // Get user profile from Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', authUser.id)
          .maybeSingle();

        // Set user data for header
        const userData = {
          name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          coursesCompleted: 0, // TODO: Get from database
          coursesInProgress: 0, // TODO: Get from database
        };
        setUser(userData);

        // Fetch user preferences from Supabase first
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('goal, role, education, topics, schedule, daily_goal_minutes')
          .eq('user_id', authUser.id)
          .maybeSingle();

        // Identify user in Lytics with preferences (single call instead of two)
        // This prevents "anonymous_profiles" segment and includes preferences in one call
        const { identifyUser } = await import('@/lib/lytics');
        identifyUser({
          email: authUser.email || '',
          user_id: authUser.id,
          full_name: profile?.full_name || undefined,
          // Include preferences if they exist
          goal: preferences?.goal || null,
          role: preferences?.role || null,
          education: preferences?.education || null,
          topics: preferences?.topics || [],
          schedule: preferences?.schedule || null,
          daily_goal_minutes: preferences?.daily_goal_minutes || null,
        });
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/login');
      }
    };

    checkUserAndSyncPreferences();
  }, [supabase, router]);

  // Use CMS courses for filtering by category
  const allDisplayCourses = cmsTopCourses.length > 0 ? transformedCourses : [...topCourses, ...recommendedCourses];
  const filteredCourses = selectedCategory 
    ? allDisplayCourses.filter(course => 
        course.category?.toLowerCase().includes(selectedCategory.replace(/-/g, '_')) ||
        course.category?.toLowerCase().includes(selectedCategory.replace(/-/g, ' '))
      )
    : null;

  // Convert CMS categories to CategoryCard format
  // Support both new CategoryEntry and legacy IconEntry formats
  const displayCategories = hasCMSCategories
    ? (homeData.categories.length > 0
        // New CategoryEntry format
        ? homeData.categories.map((cat, index) => ({
            uid: cat.uid,
            title: cat.title,
            slug: cat.taxonomies?.[0]?.term_uid || cat.title.toLowerCase().replace(/\s+/g, '-'),
            icon: cat.category_icon || 'code',
            courseCount: 100 + (index * 25), // Placeholder count
          }))
        // Legacy IconEntry format (fallback)
        : homeData.legacyCategories.map((cat, index) => ({
            uid: cat.uid,
            title: cat.icon_title || cat.title,
            slug: cat.title.toLowerCase().replace(/\s+/g, '-'),
            icon: cat.icon_name || 'code',
            courseCount: 100 + (index * 25),
          }))
      )
    : fallbackCategories;

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} />
      
      <main className={styles.main} id="top">
        {/* Promotional Carousel */}
        <section className={styles.carouselSection}>
          <div className="container">
            {hasCMSBanners ? (
              <Carousel 
                banners={homeData.banners} 
                autoPlay={homeData.carouselSettings.autoplay}
                interval={homeData.carouselSettings.interval}
              />
            ) : (
              <Carousel 
                slides={fallbackBanners} 
                autoPlay 
                interval={6000} 
              />
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section id="categories" className={styles.categoriesSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>
              {hasCMSCategories && homeData.categoriesTitle.title
                ? homeData.categoriesTitle.title
                : 'Browse by Category'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {hasCMSCategories && homeData.categoriesTitle.description
                ? homeData.categoriesTitle.description
                : 'Explore 1000+ courses across various domains and find your path'}
            </p>
            
            <div className={styles.categoryTabs}>
              {displayCategories.map((category) => (
                <CategoryCard
                  key={category.uid}
                  {...category}
                  variant="button"
                  isActive={selectedCategory === category.slug}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.slug ? null : category.slug
                  )}
                />
              ))}
            </div>

            {/* Filtered Courses by Category */}
            {selectedCategory && filteredCourses && filteredCourses.length > 0 && (
              <div className={styles.filteredCourses}>
                <div className={styles.coursesGrid}>
                  {filteredCourses.map((course) => (
                    <CourseCard key={course.uid} {...course} />
                  ))}
                </div>
              </div>
            )}

            {selectedCategory && (!filteredCourses || filteredCourses.length === 0) && (
              <div className={styles.noCourses}>
                <p>No courses found in this category. Check back soon!</p>
              </div>
            )}
          </div>
        </section>

        {/* Top Courses Section - From Card Block or fallback */}
        <section id="courses" className={styles.coursesSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {topCoursesBlock?.title || 'Top Rated Courses'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {topCoursesBlock?.description || 'Our highest-rated courses loved by students worldwide'}
                </p>
              </div>
              {topCoursesBlock?.ctaButton && (
                <Link href={topCoursesBlock.ctaButton.href} className={styles.viewAllBtn}>
                  {topCoursesBlock.ctaButton.title}
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
            
            <div className={styles.coursesGrid}>
              {(cmsTopCourses.length > 0 ? cmsTopCourses : topCourses).map((course) => (
                <CourseCard key={course.uid} {...course} />
              ))}
            </div>
          </div>
        </section>

        {/* Recommended Courses Section - From Card Block or fallback */}
        <section id="recommended" className={`${styles.coursesSection} ${styles.recommended}`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {recommendedBlock?.title || 'Recommended for You'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {recommendedBlock?.description || 'Course recommendations based on your interests'}
                </p>
              </div>
              {recommendedBlock?.ctaButton && (
                <Link href={recommendedBlock.ctaButton.href} className={styles.viewAllBtn}>
                  {recommendedBlock.ctaButton.title}
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
            
            <div className={styles.coursesGrid}>
              {(cmsRecommendedCourses.length > 0 ? cmsRecommendedCourses : recommendedCourses).map((course) => (
                <CourseCard key={course.uid} {...course} />
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className={styles.faqSection}>
          <div className="container">
            <FAQ 
              items={fallbackFaqs}
              title="Got Questions?"
              subtitle="Find answers to commonly asked questions"
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Carousel from '@/components/Carousel';
import CourseCard from '@/components/CourseCard';
import CategoryCard from '@/components/CategoryCard';
import FAQ from '@/components/FAQ';
import { useHeader } from '@/hooks/useHeader';
import { usePage } from '@/hooks/usePage';
import { 
  PageEntry, 
  IconEntry, 
  BannerEntry,
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

// Fallback courses data
const topCourses = [
  {
    uid: '1',
    title: 'Complete React Developer Course',
    slug: 'complete-react-developer',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructorName: 'Sarah Johnson',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.9,
    reviewsCount: 15600,
    studentsEnrolled: 68000,
    category: 'Development',
    isPopular: true,
  },
  {
    uid: '2',
    title: 'Python for Data Science & ML',
    slug: 'python-data-science-ml',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Michael Chen',
    level: 'beginner' as const,
    duration: '55 hours',
    rating: 4.8,
    reviewsCount: 12400,
    studentsEnrolled: 52000,
    category: 'Data Science',
    isFeatured: true,
  },
  {
    uid: '3',
    title: 'AWS Solutions Architect Pro',
    slug: 'aws-solutions-architect-pro',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    instructorName: 'David Park',
    level: 'advanced' as const,
    duration: '48 hours',
    rating: 4.9,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'Cloud',
  },
  {
    uid: '4',
    title: 'UI/UX Design Fundamentals',
    slug: 'uiux-design-fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600',
    instructorName: 'Emma Wilson',
    level: 'beginner' as const,
    duration: '32 hours',
    rating: 4.7,
    reviewsCount: 6800,
    studentsEnrolled: 24000,
    category: 'Design',
  },
];

const recommendedCourses = [
  {
    uid: '5',
    title: 'Node.js & Express Masterclass',
    slug: 'nodejs-express-masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600',
    instructorName: 'Alex Rivera',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.8,
    reviewsCount: 9200,
    studentsEnrolled: 35000,
    category: 'Development',
  },
  {
    uid: '6',
    title: 'Kubernetes in Production',
    slug: 'kubernetes-production',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600',
    instructorName: 'James Liu',
    level: 'advanced' as const,
    duration: '28 hours',
    rating: 4.9,
    reviewsCount: 4500,
    studentsEnrolled: 15000,
    category: 'DevOps',
  },
  {
    uid: '7',
    title: 'Digital Marketing Complete',
    slug: 'digital-marketing-complete',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
    instructorName: 'Lisa Anderson',
    level: 'beginner' as const,
    duration: '45 hours',
    rating: 4.6,
    reviewsCount: 7800,
    studentsEnrolled: 42000,
    category: 'Marketing',
  },
  {
    uid: '8',
    title: 'Ethical Hacking Complete',
    slug: 'ethical-hacking-complete',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
    instructorName: 'Ryan Martinez',
    level: 'intermediate' as const,
    duration: '52 hours',
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

// Helper to extract data from page sections
function extractHomePageData(pageData: PageEntry | null) {
  if (!pageData?.section) return null;

  let banners: BannerEntry[] = [];
  let categories: IconEntry[] = [];
  let carouselSettings = { interval: 5000, autoplay: true };
  let categoriesTitle = { title: '', description: '' };
  
  // Card blocks for course sections
  const cardBlocks: { type: CardBlockType; title: string; description: string }[] = [];

  for (const section of pageData.section) {
    if (isCarouselBlock(section)) {
      banners = normalizeArray(section.carousel_block.banner);
      carouselSettings = {
        interval: (section.carousel_block.interval || 5) * 1000, // Convert to ms
        autoplay: section.carousel_block.autoplay ?? true,
      };
    }
    if (isCategoryBlock(section)) {
      categories = normalizeArray(section.category_block.icon);
      categoriesTitle = {
        title: section.category_block.title_and_description?.title || '',
        description: section.category_block.title_and_description?.description || '',
      };
    }
    if (isCardBlock(section)) {
      const title = section.card_block.title_and_description?.title || '';
      const description = section.card_block.title_and_description?.description || '';
      
      // Determine card block type based on title
      let type: CardBlockType = 'unknown';
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('top') || lowerTitle.includes('rated') || lowerTitle.includes('popular')) {
        type = 'top_courses';
      } else if (lowerTitle.includes('recommend')) {
        type = 'recommended';
      }
      
      cardBlocks.push({ type, title, description });
    }
  }

  return { banners, categories, carouselSettings, categoriesTitle, cardBlocks };
}

export default function HomePage() {
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');
  
  // Fetch page data from Contentstack
  const { pageData, isLoading } = usePage('Home Page');

  // Extract section data from CMS
  const homeData = extractHomePageData(pageData);

  // Determine what data to use
  const hasCMSBanners = homeData && homeData.banners.length > 0;
  const hasCMSCategories = homeData && homeData.categories.length > 0;
  const cardBlocks = homeData?.cardBlocks || [];

  useEffect(() => {
    // Check for user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(mockUser); // Use mock for demo
    }
  }, []);

  const filteredCourses = selectedCategory 
    ? categoryCourses[selectedCategory] || topCourses 
    : null;

  // Convert CMS categories to CategoryCard format
  const displayCategories = hasCMSCategories
    ? homeData.categories.map((cat, index) => ({
        uid: cat.uid,
        title: cat.icon_title || cat.title,
        slug: cat.title.toLowerCase().replace(/\s+/g, '-'),
        icon: cat.icon_name || 'code',
        courseCount: 100 + (index * 25), // Placeholder count
      }))
    : fallbackCategories;

  // Find card blocks or use defaults
  const topCoursesBlock = cardBlocks.find(b => b.type === 'top_courses');
  const recommendedBlock = cardBlocks.find(b => b.type === 'recommended');

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
            </div>
            
            <div className={styles.coursesGrid}>
              {topCourses.map((course) => (
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
                  {recommendedBlock?.description || 'Personalized course recommendations based on your interests'}
                </p>
              </div>
            </div>
            
            <div className={styles.coursesGrid}>
              {recommendedCourses.map((course) => (
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

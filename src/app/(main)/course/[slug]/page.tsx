'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  Users,
  BookOpen,
  Star,
  Play,
  CheckCircle,
  Award,
  FileText,
  Download,
  Heart,
  ChevronDown,
  Lock,
  PlayCircle,
  ChevronRight,
  Home
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import FAQ from '@/components/FAQ';
import { useHeader } from '@/hooks/useHeader';
import { getCourseBySlug, getAllCourses, getCoursesByAuthorUid, getCourseByUid, getLivePreviewAttrs } from '@/lib/contentstack';
import { CourseEntry, ModuleEntry, LessonEntry, AuthorEntry, normalizeArray } from '@/types/contentstack';
import { createClient } from '@/utils/supabase/client';
import { getCachedUserProfile, cacheUserProfile } from '@/utils/userCache';
import { useLanguage } from '@/contexts/LanguageContext';
import LocaleMismatchPopup from '@/components/LocaleMismatchPopup';
import { trackCourseView } from '@/services/preferenceTracking';
import { getCourseReviewStats, getTopReviews, getCourseEnrollmentCount, getInstructorStats, type InstructorStats } from '@/services/reviews';
import type { CourseReview } from '@/services/reviews';
import { transformCourseToCard, TransformedCourse } from '@/hooks/useCourses';
import styles from './page.module.css';

// Mock user data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// ============================================
// DUMMY DATA - To be replaced with DB values
// ============================================

// These values will come from the database once connected
const DUMMY_DB_DATA = {
  rating: 4.8,
  reviewsCount: 8900,
  studentsEnrolled: 28000,
  instructorStats: {
    coursesCount: 12,
    studentsCount: 145000,
    rating: 4.8,
  },
  reviews: [
    {
      uid: 'rev-1',
      userName: 'Sarah Miller',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Absolutely fantastic course! Michael explains complex concepts in such an easy-to-understand way. The projects were challenging but incredibly rewarding.',
    },
    {
      uid: 'rev-2',
      userName: 'James Wilson',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      rating: 5,
      date: '1 month ago',
      comment: 'This course helped me land my dream job as a ML Engineer. The content is up-to-date and the instructor is very responsive to questions.',
    },
    {
      uid: 'rev-3',
      userName: 'Emily Zhang',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      rating: 4,
      date: '1 month ago',
      comment: 'Great course overall. The practical projects really helped solidify the concepts. Highly recommended for anyone starting in ML.',
    },
  ],
};

// Recommended courses will be fetched dynamically based on current course's category

const faqs = [
  {
    uid: '1',
    question: 'How long will I have access to the course?',
    answer: 'You have lifetime access to all course materials, including future updates.',
  },
  {
    uid: '2',
    question: 'Is there a certificate upon completion?',
    answer: 'Yes! You will receive a verified certificate that you can share on LinkedIn.',
  },
  {
    uid: '3',
    question: 'Do I need prior machine learning experience?',
    answer: 'No! This course is designed for beginners. Basic Python knowledge is helpful but not required.',
  },
  {
    uid: '4',
    question: 'Can I get help if I\'m stuck?',
    answer: 'Absolutely! Use the Q&A section to ask questions, and our instructors and community will help you.',
  },
];

// Helper to strip HTML tags from rich text
function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '') || '';
}

// Helper to extract requirements from rich text as array
function extractRequirements(html: string): string[] {
  if (!html) return [];
  const liMatches = html.match(/<li>(.*?)<\/li>/g);
  if (liMatches) {
    return liMatches.map(li => stripHtml(li));
  }
  return [stripHtml(html)];
}

type TabType = 'about' | 'outcomes' | 'modules' | 'reviews';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const supabase = createClient();
  
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [topReviews, setTopReviews] = useState<CourseReview[]>([]);
  const [studentsEnrolled, setStudentsEnrolled] = useState(0);
  const [recommendedCourses, setRecommendedCourses] = useState<TransformedCourse[]>([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(false);
  const [instructorStats, setInstructorStats] = useState<InstructorStats>({ averageRating: 0, coursesCount: 0, studentsCount: 0 });
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');
  
  // Get selected language for locale-aware content fetching
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  const [showLocalePopup, setShowLocalePopup] = useState(false);
  const [enrolledLocale, setEnrolledLocale] = useState<string | null>(null);

  // Refs for scroll navigation
  const aboutRef = useRef<HTMLDivElement>(null);
  const outcomesRef = useRef<HTMLDivElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'about' as TabType, label: 'About', ref: aboutRef },
    { id: 'outcomes' as TabType, label: 'Outcomes', ref: outcomesRef },
    { id: 'modules' as TabType, label: 'Modules', ref: modulesRef },
    { id: 'reviews' as TabType, label: 'Reviews', ref: reviewsRef },
  ];

  // Fetch course data from CMS and check enrollment
  useEffect(() => {
    // Reset state when slug or language changes - set loading first to avoid "not found" flash
    setIsLoading(true);
    setCourseData(null);
    setIsEnrolled(false);
    setIsCompleted(false);
    setCompletedLessonIds([]);
    setEnrollmentId(null);
    setExpandedModules([]);
    setShowLocalePopup(false);
    setEnrolledLocale(null);
    
    async function fetchCourse() {
      try {
        // First, check if user is enrolled to get enrolled locale
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setCurrentUser(authUser);
        
        let enrolledLocaleForFetch: string | null = null;
        let courseUidFromEnrollment: string | null = null;
        
        // If user is logged in, check all enrollments to find course by slug match
        // We need to check enrollments first to get the enrolled locale
        if (authUser) {
          // Get all enrollments for this user
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id, enrolled_locale, status, id')
            .eq('user_id', authUser.id);
          
          if (enrollments && enrollments.length > 0) {
            // Try to find course by fetching by UID (not slug) since slug might differ across locales
            for (const enrollment of enrollments) {
              try {
                // Fetch course by UID in enrolled locale
                const enrolledLocale = enrollment.enrolled_locale || 'en-us';
                const courseByUid = await getCourseByUid(enrollment.course_id, enrolledLocale);
                
                // Check if slug matches (course might have different slug in different locales)
                if (courseByUid && (courseByUid.slug === slug || courseByUid.uid === enrollment.course_id)) {
                  // Found matching course from enrollment!
                  enrolledLocaleForFetch = enrolledLocale;
                  courseUidFromEnrollment = enrollment.course_id;
                  setIsEnrolled(true);
                  setEnrollmentId(enrollment.id);
                  setEnrolledLocale(enrolledLocaleForFetch);
                  
                  if (enrollment.status === 'completed') {
                    setIsCompleted(true);
                  }
                  break;
                }
              } catch (error) {
                // Continue to next enrollment if this one fails
                continue;
              }
            }
            
            // If not found by UID, try fetching by slug in current locale and check if enrolled
            if (!enrolledLocaleForFetch) {
              const testCourse = await getCourseBySlug(slug, selectedLanguage);
              if (testCourse) {
                // Check if this course is enrolled
                const matchingEnrollment = enrollments.find(e => e.course_id === testCourse.uid);
                if (matchingEnrollment) {
                  enrolledLocaleForFetch = matchingEnrollment.enrolled_locale || null;
                  courseUidFromEnrollment = matchingEnrollment.course_id;
                  setIsEnrolled(true);
                  setEnrollmentId(matchingEnrollment.id);
                  setEnrolledLocale(enrolledLocaleForFetch);
                  
                  if (matchingEnrollment.status === 'completed') {
                    setIsCompleted(true);
                  }
                }
              }
            }
          }
        }
        
        // If we found course from enrollment, use it
        // Otherwise, fetch course with current locale or enrolled locale
        let course: CourseEntry | null = null;
        
        if (courseUidFromEnrollment && enrolledLocaleForFetch) {
          // We already found the course from enrollment, fetch it by UID
          course = await getCourseByUid(courseUidFromEnrollment, enrolledLocaleForFetch);
        }
        
        // If not found from enrollment, try fetching by slug
        if (!course) {
          // Try current locale first
          course = await getCourseBySlug(slug, selectedLanguage);
          
          // If not found and we have enrolled locale, try enrolled locale
          if (!course && enrolledLocaleForFetch && enrolledLocaleForFetch !== selectedLanguage) {
            console.log(`[Course Page] Course not found in ${selectedLanguage}, trying enrolled locale ${enrolledLocaleForFetch}`);
            course = await getCourseBySlug(slug, enrolledLocaleForFetch);
          }
          
          // If still not found, try fallback
          if (!course) {
            console.log(`[Course Page] Course not found, trying fallback en-us`);
            course = await getCourseBySlug(slug, 'en-us');
          }
        }
        
        if (course) {
          setCourseData(course);
          
          // Check if enrolled locale differs from current locale - show popup
          if (enrolledLocaleForFetch && enrolledLocaleForFetch !== selectedLanguage) {
            console.log(`[Course Page] Locale mismatch: Enrolled in ${enrolledLocaleForFetch}, viewing in ${selectedLanguage}`);
            setEnrolledLocale(enrolledLocaleForFetch);
            setShowLocalePopup(true);
          }
          
          // Track course view to Lytics
          const author = normalizeArray(course.author)[0];
          trackCourseView({
            course_slug: course.slug || slug,
            course_title: course.title || '',
            course_category: undefined,
            instructor_name: author?.title || undefined,
          });
          
          // Expand first module by default
          const modules = normalizeArray(course.modules);
          if (modules.length > 0) {
            setExpandedModules([modules[0].uid]);
          }
          
          // Fetch review stats and enrollment count
          if (course.uid) {
            try {
              const [stats, reviews, enrollmentCount] = await Promise.all([
                getCourseReviewStats(course.uid),
                getTopReviews(course.uid, 5),
                getCourseEnrollmentCount(course.uid),
              ]);
              setReviewStats(stats);
              setTopReviews(reviews);
              setStudentsEnrolled(enrollmentCount);
            } catch (error) {
              console.error('[Course Page] Error fetching reviews:', error);
            }
          }

          // Fetch instructor stats
          const authors = normalizeArray(course.author);
          const instructor = authors[0];
          if (instructor?.uid) {
            try {
              const instructorLocale = enrolledLocaleForFetch || selectedLanguage;
              const authorCourses = await getCoursesByAuthorUid(instructor.uid, instructorLocale);
              const courseUids = authorCourses.map(c => c.uid).filter(Boolean) as string[];
              const stats = await getInstructorStats(instructor.uid, courseUids);
              setInstructorStats(stats);
            } catch (error) {
              console.error('[Course Page] Error fetching instructor stats:', error);
            }
          }
          
          // Fetch completed lesson IDs if enrolled
          if (authUser && course.uid && isEnrolled) {
            const { data: lessonProgress } = await supabase
              .from('lesson_progress')
              .select('lesson_id')
              .eq('user_id', authUser.id)
              .eq('course_id', course.uid)
              .eq('is_completed', true);
            
            if (lessonProgress) {
              setCompletedLessonIds(lessonProgress.map(lp => lp.lesson_id));
            }
          }
        } else {
          // Course not found - reset state
          setCourseData(null);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
        setCourseData(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (slug && selectedLanguage) {
      fetchCourse();
    }
  }, [slug, supabase, selectedLanguage]);

  useEffect(() => {
    async function fetchUserData() {
      setIsLoadingUser(true);
      try {
        // Clear old localStorage 'user' key if it exists (might contain mock data)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
        
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Check cache first for instant display
          const cachedProfile = getCachedUserProfile(authUser.id);
          if (cachedProfile) {
            setUser(cachedProfile);
            setIsLoadingUser(false); // Show cached data immediately
          }

          // Fetch fresh data from Supabase in the background
          const [profileResult, enrollmentsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', authUser.id)
              .maybeSingle(),
            supabase
              .from('enrollments')
              .select('status')
              .eq('user_id', authUser.id)
          ]);

          const profile = profileResult.data;
          const enrollments = enrollmentsResult.data;

          const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
          const inProgressCount = enrollments?.filter(e => e.status === 'enrolled').length || 0;

          const userData = {
            name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            avatar: profile?.avatar_url || undefined,
            coursesCompleted: completedCount,
            coursesInProgress: inProgressCount,
          };
          
          // Update cache with fresh data
          cacheUserProfile(authUser.id, userData);
          
          // Update UI with fresh data (only if cache wasn't available or data changed)
          if (!cachedProfile || JSON.stringify(cachedProfile) !== JSON.stringify(userData)) {
            setUser(userData);
          }
          
          setIsLoadingUser(false);
        } else {
          // User not authenticated - don't set any user data
          setUser(null);
          setIsLoadingUser(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Don't set mock user on error
        setIsLoadingUser(false);
      }
    }

    fetchUserData();
  }, []);

  // Fetch recommended courses based on current course's category
  useEffect(() => {
    async function fetchRecommendedCourses() {
      if (!courseData || !courseData.uid) {
        setRecommendedCourses([]);
        return;
      }

      setIsLoadingRecommended(true);
      try {
        // Get current course's taxonomy term_uids
        const currentCourseTerms = courseData.taxonomies?.map(t => t.term_uid) || [];
        
        // If no taxonomies, don't fetch recommended courses
        if (currentCourseTerms.length === 0) {
          setRecommendedCourses([]);
          setIsLoadingRecommended(false);
          return;
        }

        // Fetch all courses in the selected language
        const allCourses = await getAllCourses(selectedLanguage);
        
        // Filter courses that:
        // 1. Share at least one taxonomy term with the current course
        // 2. Are not the current course
        const matchingCourses = allCourses.filter(course => {
          if (course.uid === courseData.uid) return false; // Exclude current course
          
          const courseTerms = course.taxonomies?.map(t => t.term_uid) || [];
          // Check if there's at least one matching term
          return courseTerms.some(term => currentCourseTerms.includes(term));
        });

        // Limit to 4 courses
        const limitedCourses = matchingCourses.slice(0, 4);

        // Transform courses to card format
        const transformed = await Promise.all(
          limitedCourses.map(course => transformCourseToCard(course))
        );

        setRecommendedCourses(transformed);
      } catch (error) {
        console.error('Error fetching recommended courses:', error);
        setRecommendedCourses([]);
      } finally {
        setIsLoadingRecommended(false);
      }
    }

    fetchRecommendedCourses();
  }, [courseData, selectedLanguage]);

  const scrollToSection = (tab: TabType) => {
    setActiveTab(tab);
    const ref = tabs.find(t => t.id === tab)?.ref;
    if (ref?.current) {
      const yOffset = -120;
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleModule = (moduleUid: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleUid)
        ? prev.filter(id => id !== moduleUid)
        : [...prev, moduleUid]
    );
  };

  // Process CMS data
  const modules = normalizeArray(courseData?.modules);
  const totalLessons = modules.reduce((acc, mod) => {
    const lessons = normalizeArray(mod.lessons);
    return acc + lessons.length;
  }, 0);
  
  // Get author data
  const authors = normalizeArray(courseData?.author);
  const instructor = authors[0];
  
  // Get learning outcomes
  const outcomes = courseData?.learning_outcomes?.point || [];
  
  // Get requirements
  const requirements = extractRequirements(courseData?.requirements || '');
  
  // Helper: Check if a module is unlocked (first module or previous module is 100% complete)
  const isModuleUnlocked = (moduleIndex: number): boolean => {
    if (!isEnrolled || !currentUser) return false;
    if (moduleIndex === 0) return true; // First module is always unlocked
    
    // Check if previous module is 100% complete
    const previousModule = modules[moduleIndex - 1];
    if (!previousModule) return false;
    
    const previousModuleLessons = normalizeArray(previousModule.lessons);
    const previousModuleCompletedCount = previousModuleLessons.filter(
      l => completedLessonIds.includes(l.uid)
    ).length;
    
    return previousModuleCompletedCount === previousModuleLessons.length;
  };

  // Helper: Check if a lesson is accessible
  const isLessonAccessible = (lesson: LessonEntry, moduleIndex: number): boolean => {
    // Preview lessons are always accessible
    if (lesson.is_preview) return true;
    
    // If not enrolled, only preview lessons are accessible
    if (!isEnrolled || !currentUser) return false;
    
    // Check if the module is unlocked
    return isModuleUnlocked(moduleIndex);
  };

  // Get first available lesson based on enrollment status
  const getFirstAvailableLesson = (): LessonEntry | null => {
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      const lessons = normalizeArray(mod.lessons);
      
      // Preview lessons are always available
      const previewLesson = lessons.find(l => l.is_preview);
      if (previewLesson) {
        return previewLesson;
      }
      
      // If enrolled and module is unlocked, return first lesson
      if (isEnrolled && isModuleUnlocked(i) && lessons.length > 0) {
        return lessons[0];
      }
    }
    return null;
  };

  const firstAvailableLesson = getFirstAvailableLesson();

  // Format last updated date
  const lastUpdated = courseData?.updated_at 
    ? new Date(courseData.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'December 2024';

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} isLoading={isLoadingUser} />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading course...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Course not found
  if (!courseData) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} isLoading={isLoadingUser} />
        <main className={styles.main}>
          <div className={styles.notFound}>
            <h1>Course not found</h1>
            <p>The course you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/courses">Browse Courses</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Hero image - from CMS or fallback
  // Use course_image_link (URL) or course_image (asset) for hero background
  const heroImage = courseData.course_image_link?.href || courseData.course_image?.url || 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200';
  
  // Instructor avatar - from CMS or fallback (supports profile_image_link, profile_image asset, and legacy picture field)
  const instructorAvatar = instructor?.profile_image_link?.href || instructor?.profile_image?.url || instructor?.picture?.url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200';
  
  // Course duration in hours
  const courseDuration = courseData.total_duration ? `${courseData.total_duration} hours` : '38 hours';

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <Image
              src={heroImage}
              alt={courseData.title}
              fill
              sizes="100vw"
              priority
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
          </div>

          <div className={styles.heroContent}>
            {/* Breadcrumb Navigation - Top Left */}
            <nav className={styles.breadcrumb}>
              <Link href="/home">
                <Home size={16} />
              </Link>
              <ChevronRight size={14} className={styles.breadcrumbSeparator} />
              <Link href="/courses">Courses</Link>
              <ChevronRight size={14} className={styles.breadcrumbSeparator} />
              <span className={styles.breadcrumbCurrent}>{courseData.title}</span>
            </nav>

            <div className={styles.heroText}>
              <div className={styles.levelBadge}>
                <span className={styles.badge}>{courseData.difficulty_level?.toLowerCase() || 'intermediate'}</span>
                <span className={styles.lastUpdated}>Updated {lastUpdated}</span>
              </div>

              <h1 className={styles.courseTitle}>{courseData.title}</h1>
              <p className={styles.courseDescription}>{stripHtml(courseData.short_text || '')}</p>

              <div className={styles.courseMeta}>
                {/* DB Data: Rating and Reviews */}
                <div className={styles.rating}>
                  <Star size={18} fill="var(--warning-500)" stroke="var(--warning-500)" />
                  <span className={styles.ratingValue}>
                    {reviewStats.averageRating > 0 ? reviewStats.averageRating.toFixed(1) : '0.0'}
                  </span>
                  <span className={styles.reviewsCount}>
                    ({reviewStats.totalReviews.toLocaleString()} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
                {/* DB Data: Students Enrolled */}
                <div className={styles.metaItem}>
                  <Users size={18} />
                  <span>{studentsEnrolled.toLocaleString()} {studentsEnrolled === 1 ? 'student' : 'students'}</span>
                </div>
                {/* CMS Data: Duration */}
                <div className={styles.metaItem}>
                  <Clock size={18} />
                  <span>{courseDuration}</span>
                </div>
              </div>

              {/* Hero Actions */}
              <div className={styles.heroActions}>
                {!currentUser ? (
                  // Guest State: Not logged in
                  <Link href="/login" className={`${styles.startBtn} ${styles.startLearningBtn}`}>
                    <Play size={20} />
                    Start Learning
                  </Link>
                ) : isCompleted ? (
                  // Course Completed State: Show Completed badge and Certificate button
                  <>
                    <div className={styles.completedBadge}>
                      <Award size={20} />
                      <span>Completed</span>
                    </div>
                    <Link 
                      href={enrollmentId ? `/certificate/${enrollmentId}` : `/courses`}
                      className={`${styles.startBtn} ${styles.certificateBtn}`}
                    >
                      <FileText size={20} />
                      View Certificate
                    </Link>
                  </>
                ) : isEnrolled ? (
                  // Enrolled State: Continue Learning
                  <button
                    onClick={() => {
                      // If locale mismatch, show popup (handled by popup component)
                      // Otherwise, navigate normally
                      if (enrolledLocale && enrolledLocale !== selectedLanguage) {
                        setShowLocalePopup(true);
                      } else {
                        // Normal navigation
                        if (firstAvailableLesson) {
                          router.push(`/module/${firstAvailableLesson.uid}`);
                        }
                      }
                    }}
                    className={`${styles.startBtn} ${styles.continueLearningBtn}`}
                  >
                    <Play size={20} />
                    Continue Learning
                  </button>
                ) : (
                  // Logged in but not enrolled: Enroll Now
                  <button 
                    onClick={() => router.push(`/course/${slug}/enroll-success`)}
                    className={`${styles.startBtn} ${styles.enrollBtn}`}
                  >
                    <Play size={20} />
                    Enroll Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <nav className={styles.tabNav}>
          <div className={styles.tabContainer}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => scrollToSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Sections */}
        <div className={styles.content}>
          <div className={styles.contentContainer}>
            <div className={styles.mainContent}>
              {/* About Section - CMS Data */}
              <section ref={aboutRef} className={styles.section}>
                <h2 {...getLivePreviewAttrs(courseData, 'title')}>About This Course</h2>
                <div 
                  className={styles.description}
                  {...getLivePreviewAttrs(courseData, 'about_the_course')}
                  dangerouslySetInnerHTML={{ __html: courseData.about_the_course || '' }}
                />

                {/* Instructor - CMS Data + DB Stats */}
                {instructor && (
                  <div className={styles.instructorCard}>
                    <div className={styles.instructorHeader}>
                      <div className={styles.instructorAvatarLarge}>
                        <Image src={instructorAvatar} alt={instructor.title} fill sizes="80px" />
                      </div>
                      <h3 className={styles.instructorName}>{instructor.title}</h3>
                      {/* DB Data: Instructor Stats */}
                      <div className={styles.instructorStats}>
                        <span><Star size={14} /> {instructorStats.averageRating > 0 ? instructorStats.averageRating.toFixed(1) : '0.0'} Rating</span>
                        <span><Users size={14} /> {instructorStats.studentsCount >= 1000 ? `${(instructorStats.studentsCount / 1000).toFixed(0)}k` : instructorStats.studentsCount} Students</span>
                        <span><BookOpen size={14} /> {instructorStats.coursesCount} Courses</span>
                      </div>
                    </div>
                    <p className={styles.instructorRole}>{instructor.bio?.split('.')[0] || 'Instructor'}</p>
                    <p className={styles.instructorBio}>{instructor.bio}</p>
                  </div>
                )}
              </section>

              {/* Outcomes Section - CMS Data */}
              <section ref={outcomesRef} className={styles.section}>
                <h2>What You&apos;ll Learn</h2>
                <div className={styles.outcomesGrid}>
                  {outcomes.map((outcome, index) => (
                    <div key={index} className={styles.outcomeItem}>
                      <CheckCircle size={20} />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>

                <h3 className={styles.subheading}>Requirements</h3>
                <ul className={styles.requirementsList}>
                  {requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </section>

              {/* Modules Section - CMS Data */}
              <section ref={modulesRef} className={styles.section}>
                <h2>Course Content</h2>
                <p className={styles.modulesSummary}>
                  {modules.length} modules • {totalLessons} lessons • {courseDuration} total
                </p>

                <div className={styles.modulesList}>
                  {modules.map((module, moduleIndex) => {
                    const moduleLessons = normalizeArray(module.lessons);
                    const moduleCompletedCount = moduleLessons.filter(
                      l => completedLessonIds.includes(l.uid)
                    ).length;
                    const isUnlocked = isModuleUnlocked(moduleIndex);
                    const isModuleLocked = isEnrolled && currentUser && !isUnlocked;
                    
                    return (
                      <div 
                        key={module.uid} 
                        className={`${styles.moduleItem} ${expandedModules.includes(module.uid) ? styles.expanded : ''} ${isModuleLocked ? styles.moduleLocked : ''}`}
                      >
                        <button
                          className={styles.moduleHeader}
                          onClick={() => !isModuleLocked && toggleModule(module.uid)}
                          disabled={isModuleLocked}
                        >
                          <ChevronDown size={20} className={styles.moduleChevron} />
                          <div className={styles.moduleInfo}>
                            <h4>
                              {isModuleLocked && <Lock size={16} className={styles.moduleLockIcon} />}
                              {module.title}
                            </h4>
                            <span>
                              {moduleLessons.length} lessons • {module.duration || '1h 30min'}
                              {isEnrolled && currentUser && (
                                <span className={styles.moduleProgress}>
                                  {' '}• {moduleCompletedCount}/{moduleLessons.length} completed
                                </span>
                              )}
                            </span>
                          </div>
                        </button>

                        <div className={styles.lessonsList}>
                          {moduleLessons.map((lesson) => {
                            const isCompleted = completedLessonIds.includes(lesson.uid);
                            const isAccessible = isLessonAccessible(lesson, moduleIndex);
                            
                            return (
                              <Link
                                key={lesson.uid}
                                href={isAccessible ? `/module/${lesson.uid}` : '#'}
                                className={`${styles.lessonItem} ${!isAccessible ? styles.locked : ''} ${isCompleted ? styles.completed : ''}`}
                                onClick={(e) => {
                                  if (!isAccessible) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                {isCompleted ? (
                                  <CheckCircle size={16} className={styles.completedIcon} />
                                ) : isAccessible ? (
                                  <Play size={16} />
                                ) : (
                                  <Lock size={16} />
                                )}
                                <span className={styles.lessonTitle}>{lesson.title}</span>
                                <span className={styles.lessonDuration}>{lesson.duration || '15:00'}</span>
                                {lesson.is_preview && isAccessible && (
                                  <span className={styles.previewBadge}>Preview</span>
                                )}
                                {isCompleted && (
                                  <span className={styles.completedBadge}>Completed</span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Reviews Section - Real DB Data */}
              <section ref={reviewsRef} className={styles.section}>
                <h2>Student Reviews</h2>
                
                {reviewStats.totalReviews > 0 ? (
                  <>
                    <div className={styles.reviewsSummary}>
                      <div className={styles.ratingLarge}>
                        <span className={styles.ratingNumber}>
                          {reviewStats.averageRating.toFixed(1)}
                        </span>
                        <div className={styles.ratingStars}>
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={20} 
                              fill={i < Math.round(reviewStats.averageRating) ? 'var(--warning-500)' : 'var(--neutral-300)'} 
                              stroke={i < Math.round(reviewStats.averageRating) ? 'var(--warning-500)' : 'var(--neutral-300)'}
                            />
                          ))}
                        </div>
                        <span className={styles.totalReviews}>
                          {reviewStats.totalReviews.toLocaleString()} {reviewStats.totalReviews === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.reviewsList}>
                      {topReviews.length > 0 ? (
                        topReviews.map((review) => {
                          const reviewDate = new Date(review.created_at);
                          const formattedDate = reviewDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                          
                          const userName = review.user_name || 'Anonymous';
                          const userInitial = userName.charAt(0).toUpperCase();
                          
                          return (
                            <div key={review.id} className={styles.reviewItem}>
                              <div className={styles.reviewHeader}>
                                <div className={styles.reviewerAvatar}>
                                  {review.user_avatar_url ? (
                                    <Image 
                                      src={review.user_avatar_url} 
                                      alt={userName} 
                                      fill 
                                      sizes="48px"
                                      style={{ objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <span>{userInitial}</span>
                                  )}
                                </div>
                                <div className={styles.reviewerInfo}>
                                  <h4>{userName}</h4>
                                  <div className={styles.reviewMeta}>
                                    <div className={styles.reviewStars}>
                                      {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} size={14} fill="var(--warning-500)" stroke="var(--warning-500)" />
                                      ))}
                                    </div>
                                    <span>{formattedDate}</span>
                                  </div>
                                </div>
                              </div>
                              {review.comment && (
                                <p className={styles.reviewComment}>{review.comment}</p>
                              )}
                            </div>
                          );
                        })
                      ) : reviewStats.totalReviews > 0 ? (
                        <p style={{ color: 'var(--neutral-500)', textAlign: 'center', padding: '40px 0' }}>
                          Loading reviews...
                        </p>
                      ) : (
                        <p style={{ color: 'var(--neutral-500)', textAlign: 'center', padding: '40px 0' }}>
                          No reviews yet. Be the first to review this course!
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ color: 'var(--neutral-500)' }}>
                      No reviews yet. Be the first to review this course!
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Recommended Courses */}
        <section className={styles.recommended}>
          <div className="container">
            <h2 className={styles.recommendedTitle}>You May Also Like</h2>
            {isLoadingRecommended ? (
              <div className={styles.loadingMessage}>Loading recommended courses...</div>
            ) : recommendedCourses.length > 0 ? (
              <div className={styles.recommendedGrid}>
                {recommendedCourses.map((course) => (
                  <CourseCard key={course.uid} {...course} />
                ))}
              </div>
            ) : (
              <div className={styles.noCoursesMessage}>No recommended courses found.</div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faqSection}>
          <div className="container">
            <FAQ 
              items={faqs}
              title="Course FAQs"
              subtitle="Common questions about this course"
            />
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Locale Mismatch Popup */}
      {showLocalePopup && enrolledLocale && (
        <LocaleMismatchPopup
          enrolledLocale={enrolledLocale}
          currentLocale={selectedLanguage}
          onSwitchLocale={() => {
            setSelectedLanguage(enrolledLocale);
            setShowLocalePopup(false);
            // Navigate to first lesson after switching locale
            if (firstAvailableLesson) {
              router.push(`/module/${firstAvailableLesson.uid}`);
            }
          }}
        />
      )}
    </>
  );
}

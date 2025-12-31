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
  Globe,
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
import { getCourseBySlug } from '@/lib/contentstack';
import { CourseEntry, ModuleEntry, LessonEntry, AuthorEntry, normalizeArray } from '@/types/contentstack';
import { createClient } from '@/utils/supabase/client';
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

// Recommended courses - using real CMS course slugs
const recommendedCourses = [
  {
    uid: 'bltab2bba525506ec98',
    title: 'Python for Data Science',
    slug: 'python-data-science',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Priya Sharma',
    level: 'beginner' as const,
    duration: '40 hours',
    rating: 4.8,
    reviewsCount: 12400,
    studentsEnrolled: 52000,
  },
  {
    uid: 'blte66355d66dec039d',
    title: 'Complete React Developer Course',
    slug: 'react-developer-course',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructorName: 'Sarah Johnson',
    level: 'beginner' as const,
    duration: '35 hours',
    rating: 4.9,
    reviewsCount: 15600,
    studentsEnrolled: 68000,
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
  },
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
  },
];

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
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');

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
    async function fetchCourse() {
      setIsLoading(true);
      try {
        const course = await getCourseBySlug(slug);
        if (course) {
          setCourseData(course);
          // Expand first module by default
          const modules = normalizeArray(course.modules);
          if (modules.length > 0) {
            setExpandedModules([modules[0].uid]);
          }
          
          // Check enrollment status from Supabase
          const { data: { user: authUser } } = await supabase.auth.getUser();
          setCurrentUser(authUser);
          
          if (authUser && course.uid) {
            // Check enrollment
            const { data: enrollment } = await supabase
              .from('enrollments')
              .select('id, status')
              .eq('user_id', authUser.id)
              .eq('course_id', course.uid)
              .maybeSingle();
            
            if (enrollment) {
              setIsEnrolled(true);
              setEnrollmentId(enrollment.id);
              
              // Check if course is completed
              if (enrollment.status === 'completed') {
                setIsCompleted(true);
              }
              
              // Fetch completed lesson IDs
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
          }
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (slug) {
      fetchCourse();
    }
  }, [slug, supabase]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(mockUser);
    }
  }, []);

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
        <Header variant="app" user={user} headerData={headerData} />
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
        <Header variant="app" user={user} headerData={headerData} />
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
  
  // Language - first from supported languages or default
  const courseLanguage = courseData.languages_supported?.[0] || 'English';

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
                  <span className={styles.ratingValue}>{DUMMY_DB_DATA.rating}</span>
                  <span className={styles.reviewsCount}>({DUMMY_DB_DATA.reviewsCount.toLocaleString()} reviews)</span>
                </div>
                {/* DB Data: Students Enrolled */}
                <div className={styles.metaItem}>
                  <Users size={18} />
                  <span>{DUMMY_DB_DATA.studentsEnrolled.toLocaleString()} students</span>
                </div>
                {/* CMS Data: Duration */}
                <div className={styles.metaItem}>
                  <Clock size={18} />
                  <span>{courseDuration}</span>
                </div>
                {/* CMS Data: Language */}
                <div className={styles.metaItem}>
                  <Globe size={18} />
                  <span>{courseLanguage}</span>
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
                  <Link 
                    href={firstAvailableLesson ? `/module/${firstAvailableLesson.uid}` : `/learn/${courseData.uid}`} 
                    className={`${styles.startBtn} ${styles.continueLearningBtn}`}
                  >
                    <Play size={20} />
                    Continue Learning
                  </Link>
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
                <h2>About This Course</h2>
                <div 
                  className={styles.description}
                  dangerouslySetInnerHTML={{ __html: courseData.about_the_course || '' }}
                />

                {/* Instructor - CMS Data + DB Stats */}
                {instructor && (
                  <div className={styles.instructorCard}>
                    <div className={styles.instructorHeader}>
                      <div className={styles.instructorAvatarLarge}>
                        <Image src={instructorAvatar} alt={instructor.title} fill />
                      </div>
                      <h3 className={styles.instructorName}>{instructor.title}</h3>
                      {/* DB Data: Instructor Stats */}
                      <div className={styles.instructorStats}>
                        <span><Star size={14} /> {DUMMY_DB_DATA.instructorStats.rating} Rating</span>
                        <span><Users size={14} /> {(DUMMY_DB_DATA.instructorStats.studentsCount / 1000).toFixed(0)}k Students</span>
                        <span><BookOpen size={14} /> {DUMMY_DB_DATA.instructorStats.coursesCount} Courses</span>
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

              {/* Reviews Section - DB Data (Dummy for now) */}
              <section ref={reviewsRef} className={styles.section}>
                <h2>Student Reviews</h2>
                
                <div className={styles.reviewsSummary}>
                  <div className={styles.ratingLarge}>
                    <span className={styles.ratingNumber}>{DUMMY_DB_DATA.rating}</span>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={20} 
                          fill={i < Math.round(DUMMY_DB_DATA.rating) ? 'var(--warning-500)' : 'var(--neutral-300)'} 
                          stroke={i < Math.round(DUMMY_DB_DATA.rating) ? 'var(--warning-500)' : 'var(--neutral-300)'}
                        />
                      ))}
                    </div>
                    <span className={styles.totalReviews}>
                      {DUMMY_DB_DATA.reviewsCount.toLocaleString()} reviews
                    </span>
                  </div>
                </div>

                <div className={styles.reviewsList}>
                  {DUMMY_DB_DATA.reviews.map((review) => (
                    <div key={review.uid} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewerAvatar}>
                          <Image src={review.userAvatar} alt={review.userName} fill />
                        </div>
                        <div className={styles.reviewerInfo}>
                          <h4>{review.userName}</h4>
                          <div className={styles.reviewMeta}>
                            <div className={styles.reviewStars}>
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} size={14} fill="var(--warning-500)" stroke="var(--warning-500)" />
                              ))}
                            </div>
                            <span>{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className={styles.reviewComment}>{review.comment}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Recommended Courses */}
        <section className={styles.recommended}>
          <div className="container">
            <h2 className={styles.recommendedTitle}>You May Also Like</h2>
            <div className={styles.recommendedGrid}>
              {recommendedCourses.map((course) => (
                <CourseCard key={course.uid} {...course} />
              ))}
            </div>
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
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Award, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import { useHeader } from '@/hooks/useHeader';
import { createClient } from '@/utils/supabase/client';
import { getCourseByUid } from '@/lib/contentstack';
import { CourseEntry, normalizeArray, AuthorEntry } from '@/types/contentstack';
import styles from './page.module.css';

interface EnrolledCourse {
  course_uid: string;
  progress: number;
  enrolled_at: string;
  last_accessed_at?: string;
  course?: CourseEntry;
}

export default function MyCoursesPage() {
  const router = useRouter();
  const supabase = createClient();
  const { headerData } = useHeader('App Header');
  
  const [user, setUser] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    async function fetchUserAndCourses() {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          router.push('/login');
          return;
        }

        setUser(currentUser);

        // Fetch enrolled courses from Supabase enrollments table (including completed)
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('course_id, enrolled_at, status')
          .eq('user_id', currentUser.id)
          .in('status', ['enrolled', 'completed']);

        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
          setLoading(false);
          return;
        }

        // Fetch course details from Contentstack and calculate progress
        const coursesWithDetails = await Promise.all(
          (enrollments || []).map(async (enrollment) => {
            try {
              const course = await getCourseByUid(enrollment.course_id);
              
              // Calculate progress from lesson_progress table
              const { data: lessonProgress } = await supabase
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', currentUser.id)
                .eq('course_id', enrollment.course_id)
                .eq('is_completed', true);
              
              // Count total lessons in course
              const modules = normalizeArray(course?.modules);
              let totalLessons = 0;
              modules.forEach(module => {
                totalLessons += normalizeArray(module.lessons).length;
              });
              
              const completedLessons = lessonProgress?.length || 0;
              // If enrollment status is 'completed', set progress to 100
              // Otherwise calculate based on completed lessons
              const progress = enrollment.status === 'completed' 
                ? 100 
                : (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
              
              return {
                course_uid: enrollment.course_id,
                progress,
                enrolled_at: enrollment.enrolled_at,
                course,
              };
            } catch (error) {
              console.error(`Error fetching course ${enrollment.course_id}:`, error);
              return null;
            }
          })
        );

        setEnrolledCourses(coursesWithDetails.filter(ec => ec !== null && ec.course) as EnrolledCourse[]);
      } catch (error) {
        console.error('Error fetching user courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndCourses();
  }, [router, supabase]);

  const filteredCourses = enrolledCourses.filter(enrollment => {
    if (filter === 'completed') return enrollment.progress === 100;
    if (filter === 'in-progress') return enrollment.progress > 0 && enrollment.progress < 100;
    return true;
  });

  const completedCount = enrolledCourses.filter(ec => ec.progress === 100).length;
  const inProgressCount = enrolledCourses.filter(ec => ec.progress > 0 && ec.progress < 100).length;
  const totalCount = enrolledCourses.length;

  // Get author name helper
  const getAuthorName = (author: AuthorEntry | AuthorEntry[] | undefined): string => {
    if (!author) return 'Instructor';
    const authors = normalizeArray(author);
    return authors[0]?.title || 'Instructor';
  };

  // Format duration helper
  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading your courses...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroIcon}>
              <BookOpen size={32} />
            </div>
            <h1>My Courses</h1>
            <p>Continue your learning journey and track your progress</p>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.stats}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <BookOpen size={24} />
              </div>
              <div className={styles.statContent}>
                <h3>{totalCount}</h3>
                <p>Total Courses</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.inProgressIcon}`}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.statContent}>
                <h3>{inProgressCount}</h3>
                <p>In Progress</p>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.completedIcon}`}>
                <Award size={24} />
              </div>
              <div className={styles.statContent}>
                <h3>{completedCount}</h3>
                <p>Completed</p>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className={styles.content}>
          <div className={styles.container}>
            {/* Filters */}
            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                All Courses ({totalCount})
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'in-progress' ? styles.active : ''}`}
                onClick={() => setFilter('in-progress')}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                className={`${styles.filterBtn} ${filter === 'completed' ? styles.active : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Courses Grid */}
            {filteredCourses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <BookOpen size={64} />
                </div>
                <h2>
                  {filter === 'all' 
                    ? "You haven't enrolled in any courses yet" 
                    : filter === 'completed'
                    ? "No completed courses yet"
                    : "No courses in progress"}
                </h2>
                <p>
                  {filter === 'all'
                    ? "Start your learning journey by exploring our course catalog"
                    : "Keep learning to see your progress here"}
                </p>
                <button
                  className={styles.browseBtn}
                  onClick={() => router.push('/courses')}
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className={styles.coursesGrid}>
                {filteredCourses.map((enrollment) => {
                  const course = enrollment.course!;
                  const thumbnail = course.course_image_link?.href || 
                    (course.course_image?.url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600');
                  
                  return (
                    <CourseCard
                      key={enrollment.course_uid}
                      uid={course.uid}
                      title={course.title}
                      slug={course.slug}
                      thumbnail={thumbnail}
                      instructorName={getAuthorName(course.author)}
                      level={course.difficulty_level?.toLowerCase() as 'beginner' | 'intermediate' | 'advanced' || 'beginner'}
                      duration={formatDuration(course.total_duration)}
                      rating={4.8}
                      reviewsCount={8900}
                      studentsEnrolled={28000}
                      progress={enrollment.progress}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}





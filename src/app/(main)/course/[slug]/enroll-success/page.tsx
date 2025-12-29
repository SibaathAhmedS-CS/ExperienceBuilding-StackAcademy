'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Sparkles, BookOpen, Play, Star } from 'lucide-react';
import { getCourseBySlug } from '@/lib/contentstack';
import { CourseEntry, normalizeArray, LessonEntry } from '@/types/contentstack';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function EnrollmentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [animationStage, setAnimationStage] = useState<'loading' | 'success' | 'redirecting'>('loading');
  const [confettiActive, setConfettiActive] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCourse() {
      try {
        const course = await getCourseBySlug(slug);
        if (course) {
          setCourseData(course);
          
          // Save enrollment to localStorage (temporary solution)
          // TODO: Replace with Supabase table insert
          const { data: { user } } = await supabase.auth.getUser();
          if (user && course.uid) {
            const enrolledData = localStorage.getItem(`enrolled_courses_${user.id}`);
            const enrolled = enrolledData ? JSON.parse(enrolledData) : [];
            
            // Check if already enrolled
            const existingIndex = enrolled.findIndex((e: any) => e.course_uid === course.uid);
            
            if (existingIndex === -1) {
              // Add new enrollment
              enrolled.push({
                course_uid: course.uid,
                progress: 0,
                enrolled_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString(),
              });
              localStorage.setItem(`enrolled_courses_${user.id}`, JSON.stringify(enrolled));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      }
    }

    if (slug) {
      fetchCourse();
    }
  }, [slug, supabase]);

  useEffect(() => {
    // Stage 1: Loading animation (1.5 seconds) - no progress bar
    const loadingTimer = setTimeout(() => {
      setAnimationStage('success');
      setConfettiActive(true);
    }, 1500);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (animationStage === 'success') {
      // Stage 2: Show success for 2.5 seconds, then redirect
      const successTimer = setTimeout(() => {
        setAnimationStage('redirecting');
        
        // Find first lesson
        if (courseData) {
          const modules = normalizeArray(courseData.modules);
          let firstLesson: LessonEntry | null = null;
          
          for (const mod of modules) {
            const lessons = normalizeArray(mod.lessons);
            const previewLesson = lessons.find(l => l.is_preview);
            if (previewLesson) {
              firstLesson = previewLesson;
              break;
            }
          }
          
          if (!firstLesson && modules.length > 0) {
            const firstModuleLessons = normalizeArray(modules[0].lessons);
            firstLesson = firstModuleLessons[0] || null;
          }
          
          // Redirect to first lesson after 1 second
          setTimeout(() => {
            if (firstLesson) {
              router.push(`/module/${firstLesson.uid}`);
            } else {
              router.push(`/course/${slug}`);
            }
          }, 1000);
        } else {
          // Fallback redirect
          setTimeout(() => {
            router.push(`/course/${slug}`);
          }, 1000);
        }
      }, 2500);

      return () => clearTimeout(successTimer);
    }
  }, [animationStage, courseData, router, slug]);

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
  }));

  return (
    <div className={styles.container}>
      {/* Confetti Effect */}
      {confettiActive && (
        <div className={styles.confettiContainer}>
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className={styles.confetti}
              style={{
                left: `${particle.left}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className={styles.content}>
        {/* Loading Stage */}
        {animationStage === 'loading' && (
          <div className={styles.loadingStage}>
            <div className={styles.loadingIcon}>
              <div className={styles.spinner}>
                <BookOpen size={48} />
              </div>
            </div>
            <h2 className={styles.title}>Enrolling You In...</h2>
            <p className={styles.subtitle}>{courseData?.title || 'Course'}</p>
          </div>
        )}

        {/* Success Stage */}
        {animationStage === 'success' && (
          <div className={styles.successStage}>
            <div className={styles.successIcon}>
              <div className={styles.checkmarkCircle}>
                <CheckCircle size={80} strokeWidth={3} />
              </div>
              <div className={styles.sparkles}>
                <Sparkles size={24} className={styles.sparkle1} />
                <Sparkles size={24} className={styles.sparkle2} />
                <Sparkles size={24} className={styles.sparkle3} />
                <Sparkles size={24} className={styles.sparkle4} />
              </div>
            </div>
            <h1 className={styles.successTitle}>🎉 You're Enrolled!</h1>
            <p className={styles.successSubtitle}>
              Welcome to <strong>{courseData?.title || 'this course'}</strong>
            </p>
            <div className={styles.courseInfo}>
              {courseData && (
                <>
                  <div className={styles.infoItem}>
                    <BookOpen size={20} />
                    <span>
                      {normalizeArray(courseData.modules).length} Modules
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <Play size={20} />
                    <span>
                      {normalizeArray(courseData.modules).reduce((acc, mod) => {
                        return acc + normalizeArray(mod.lessons).length;
                      }, 0)} Lessons
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className={styles.redirectingHint}>
              <p>Taking you to your first lesson...</p>
            </div>
          </div>
        )}

        {/* Redirecting Stage */}
        {animationStage === 'redirecting' && (
          <div className={styles.redirectingStage}>
            <div className={styles.loadingIcon}>
              <div className={styles.spinner}>
                <BookOpen size={48} />
              </div>
            </div>
            <h2 className={styles.title}>Starting Your Learning Journey...</h2>
            <p className={styles.subtitle}>Get ready to learn!</p>
          </div>
        )}
      </div>

      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gradientOrb3} />
      </div>
    </div>
  );
}


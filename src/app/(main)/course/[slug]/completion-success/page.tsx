'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Award, Sparkles, Trophy, Star, FileText } from 'lucide-react';
import { getCourseBySlug } from '@/lib/contentstack';
import { CourseEntry, normalizeArray } from '@/types/contentstack';
import { createClient } from '@/utils/supabase/client';
import styles from './page.module.css';

export default function CompletionSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [animationStage, setAnimationStage] = useState<'loading' | 'success' | 'redirecting'>('loading');
  const [confettiActive, setConfettiActive] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchCourse() {
      try {
        const course = await getCourseBySlug(slug);
        if (course) {
          setCourseData(course);
          
          // Fetch enrollment ID for certificate link
          const { data: { user } } = await supabase.auth.getUser();
          if (user && course.uid) {
            const { data: enrollment } = await supabase
              .from('enrollments')
              .select('id')
              .eq('user_id', user.id)
              .eq('course_id', course.uid)
              .maybeSingle();
            
            if (enrollment) {
              setEnrollmentId(enrollment.id);
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
    // Stage 1: Loading animation (1.5 seconds)
    const loadingTimer = setTimeout(() => {
      setAnimationStage('success');
      setConfettiActive(true);
    }, 1500);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (animationStage === 'success') {
      // Stage 2: Show success for 3 seconds, then redirect to certificate
      const successTimer = setTimeout(() => {
        setAnimationStage('redirecting');
        
        // Redirect to certificate page after 1 second
        setTimeout(() => {
          if (enrollmentId) {
            router.push(`/certificate/${enrollmentId}`);
          } else if (courseData?.uid) {
            // Fallback: try to redirect to course page if enrollment not found
            router.push(`/course/${slug}`);
          } else {
            router.push('/courses');
          }
        }, 1000);
      }, 3000);

      return () => clearTimeout(successTimer);
    }
  }, [animationStage, enrollmentId, courseData, router, slug]);

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    color: ['#fbbf24', '#f59e0b', '#d97706', '#fbbf24', '#10b981', '#3b82f6'][Math.floor(Math.random() * 6)],
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
                <Trophy size={48} />
              </div>
            </div>
            <h2 className={styles.title}>Completing Course...</h2>
            <p className={styles.subtitle}>{courseData?.title || 'Course'}</p>
          </div>
        )}

        {/* Success Stage */}
        {animationStage === 'success' && (
          <div className={styles.successStage}>
            <div className={styles.successIcon}>
              <div className={styles.awardCircle}>
                <Award size={80} strokeWidth={3} />
              </div>
              <div className={styles.sparkles}>
                <Sparkles size={28} className={styles.sparkle1} />
                <Sparkles size={28} className={styles.sparkle2} />
                <Sparkles size={28} className={styles.sparkle3} />
                <Sparkles size={28} className={styles.sparkle4} />
                <Star size={24} className={styles.sparkle5} />
                <Star size={24} className={styles.sparkle6} />
              </div>
            </div>
            <h1 className={styles.successTitle}>
              <span className={styles.emoji}>🎉</span> Congratulations!
            </h1>
            <p className={styles.successSubtitle}>
              You've successfully completed <strong>{courseData?.title || 'this course'}</strong>
            </p>
            <div className={styles.courseInfo}>
              {courseData && (
                <>
                  <div className={styles.infoItem}>
                    <Trophy size={20} />
                    <span>Course Completed</span>
                  </div>
                  <div className={styles.infoItem}>
                    <FileText size={20} />
                    <span>Certificate Ready</span>
                  </div>
                </>
              )}
            </div>
            <div className={styles.redirectingHint}>
              <p>Preparing your certificate...</p>
            </div>
          </div>
        )}

        {/* Redirecting Stage */}
        {animationStage === 'redirecting' && (
          <div className={styles.redirectingStage}>
            <div className={styles.loadingIcon}>
              <div className={styles.spinner}>
                <FileText size={48} />
              </div>
            </div>
            <h2 className={styles.title}>Opening Your Certificate...</h2>
            <p className={styles.subtitle}>Get ready to download!</p>
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


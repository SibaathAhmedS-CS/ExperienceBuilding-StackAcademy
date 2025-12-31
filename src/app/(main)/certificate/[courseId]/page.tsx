'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, BookOpen, AlertCircle } from 'lucide-react';
import { getCourseByUid } from '@/lib/contentstack';
import { CourseEntry, normalizeArray } from '@/types/contentstack';
import { createClient } from '@/utils/supabase/client';
import Script from 'next/script';
import styles from './page.module.css';

// Type declarations for html2pdf.js loaded via CDN
declare global {
  interface Window {
    html2pdf: () => {
      set: (options: any) => {
        from: (element: HTMLElement) => {
          save: () => void;
        };
      };
    };
  }
}

interface CertificateData {
  userName: string;
  courseTitle: string;
  completionDate: string;
  certificateId: string;
  courseDomain?: string;
}

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [html2pdfLoaded, setHtml2pdfLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCertificateData() {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('Please log in to view your certificate.');
          router.push('/login');
          return;
        }

        // Fetch user profile for full name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        const userName = profile?.full_name || user.email?.split('@')[0] || 'Student';

        // Fetch course data from Contentstack
        const course = await getCourseByUid(courseId);
        if (!course) {
          setError('Course not found.');
          setLoading(false);
          return;
        }
        setCourseData(course);

        // Check enrollment
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!enrollment) {
          setError('You are not enrolled in this course.');
          setLoading(false);
          return;
        }

        // Check if course is completed
        const modules = normalizeArray(course.modules);
        let totalLessons = 0;
        modules.forEach(module => {
          totalLessons += normalizeArray(module.lessons).length;
        });

        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('is_completed', true);

        const completedLessons = lessonProgress?.length || 0;
        const courseCompleted = totalLessons > 0 && completedLessons === totalLessons;

        if (!courseCompleted) {
          setError(`Course not completed yet. You've completed ${completedLessons} of ${totalLessons} lessons.`);
          setIsCompleted(false);
          setLoading(false);
          return;
        }

        setIsCompleted(true);

        // Get completion date (use the latest lesson completion date or enrollment date)
        const { data: latestCompletion } = await supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('is_completed', true)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const completionDate = latestCompletion?.completed_at 
          ? new Date(latestCompletion.completed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

        // Generate certificate ID
        const certificateId = `CERT-${courseId.substring(0, 8).toUpperCase()}-${user.id.substring(0, 8).toUpperCase()}`;

        // Extract domain from course taxonomies
        const domain = course.taxonomies && course.taxonomies.length > 0 
          ? course.taxonomies[0].term_uid 
          : undefined;

        setCertificateData({
          userName,
          courseTitle: course.title,
          completionDate,
          certificateId,
          courseDomain: domain
        });

      } catch (err) {
        console.error('Error fetching certificate data:', err);
        setError('An error occurred while loading your certificate.');
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      fetchCertificateData();
    }
  }, [courseId, supabase, router]);

  const downloadPDF = () => {
    if (!certificateRef.current || !html2pdfLoaded) {
      alert('PDF library is still loading. Please wait a moment and try again.');
      return;
    }

    const element = certificateRef.current;
    const options = {
      margin: 0,
      filename: `Certificate-${certificateData?.courseTitle.replace(/\s+/g, '-') || 'Course'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Higher scale = higher resolution
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'in', 
        format: [11, 8.5], // Landscape orientation (width x height)
        orientation: 'landscape'
      }
    };

    if (window.html2pdf && window.html2pdf().set) {
      window.html2pdf().set(options).from(element).save();
    } else {
      alert('PDF library not available. Please refresh the page and try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your certificate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Unable to Generate Certificate</h2>
        <p>{error}</p>
        <button 
          onClick={() => router.push('/my-courses')}
          className={styles.backButton}
        >
          Back to My Courses
        </button>
      </div>
    );
  }

  if (!certificateData || !isCompleted) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Certificate Not Available</h2>
        <p>Please complete all lessons in the course to receive your certificate.</p>
        <button 
          onClick={() => router.push(`/course/${courseData?.slug || courseId}`)}
          className={styles.backButton}
        >
          Back to Course
        </button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
        onLoad={() => setHtml2pdfLoaded(true)}
        strategy="lazyOnload"
      />
      
      <div className={styles.pageContainer}>
        <div className={styles.controls}>
          <button 
            onClick={downloadPDF}
            className={styles.downloadButton}
            disabled={!html2pdfLoaded}
          >
            <Download size={20} />
            {html2pdfLoaded ? 'Download Certificate' : 'Loading PDF Library...'}
          </button>
          <button 
            onClick={() => router.push('/my-courses')}
            className={styles.backButton}
          >
            Back to My Courses
          </button>
        </div>

        <div className={styles.certificateWrapper}>
          <div ref={certificateRef} className={styles.certificateContainer}>
            {/* Decorative Border */}
            <div className={styles.borderOuter}></div>
            <div className={styles.borderInner}></div>
            
            {/* Certificate Content */}
            <div className={styles.certificateContent}>
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.logoSection}>
                  <div className={styles.logoCircle}>
                    <BookOpen size={60} strokeWidth={2.5} />
                  </div>
                  <h2 className={styles.appName}>StackAcademy</h2>
                </div>
                <h1 className={styles.certificateTitle}>Certificate of Achievement</h1>
                <div className={styles.titleUnderline}></div>
              </div>

              {/* Main Content */}
              <div className={styles.mainContent}>
                <p className={styles.certifyText}>This is to certify that</p>
                <h2 className={styles.studentName}>{certificateData.userName}</h2>
                <p className={styles.completionText}>
                  has successfully completed the course
                </p>
                <h3 className={styles.courseTitle}>{certificateData.courseTitle}</h3>
              </div>

              {/* Footer */}
              <div className={styles.footer}>
                <div className={styles.dateSection}>
                  <p className={styles.dateLabel}>Given this day</p>
                  <p className={styles.dateValue}>{certificateData.completionDate}</p>
                </div>
                <div className={styles.idSection}>
                  <p className={styles.idLabel}>Certificate ID</p>
                  <p className={styles.idValue}>{certificateData.certificateId}</p>
                </div>
              </div>

              {/* Watermark Pattern */}
              <div className={styles.watermark}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


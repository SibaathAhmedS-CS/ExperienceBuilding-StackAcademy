'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { getCourseByUid } from '@/lib/contentstack';
import { createClient } from '@/utils/supabase/client';
import Script from 'next/script';
import styles from './page.module.css';

declare global {
  interface Window {
    html2pdf: any;
  }
}

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const [certificateData, setCertificateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [html2pdfLoaded, setHtml2pdfLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCertificateData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        const course = await getCourseByUid(courseId);
        
        if (course) {
          setCertificateData({
            userName: profile?.full_name || user.email?.split('@')[0] || 'Student',
            courseTitle: course.title,
            completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            certificateId: `CERT-${courseId.substring(0, 6)}-${user.id.substring(0, 4)}`.toUpperCase()
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificateData();
  }, [courseId, supabase, router]);

  const downloadPDF = async () => {
    if (!certificateRef.current || !window.html2pdf) return;

    const element = certificateRef.current;
    
    // Crucial for fixing "Blank Page": Set temporary explicit style for capture
    const originalStyle = element.style.cssText;
    element.style.position = 'relative';
    element.style.left = '0';
    element.style.top = '0';

    const options = {
      margin: 0,
      filename: `Certificate-${certificateData.userName.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, // Higher scale = better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Force white background
        scrollY: -window.scrollY, // Fix offset issues
        removeContainer: true
      },
      jsPDF: { 
        unit: 'px', 
        format: [1000, 700], // Match your CSS width/height exactly
        orientation: 'landscape',
        hotfixes: ['px_scaling']
      }
    };

    try {
      // Use the worker approach for more stability
      const worker = window.html2pdf().set(options).from(element);
      await worker.save();
    } catch (error) {
      console.error('PDF Error:', error);
    } finally {
      // Restore original styles
      element.style.cssText = originalStyle;
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}>
            <Loader2 size={48} className={styles.spinnerIcon} />
          </div>
          <h2 className={styles.loadingTitle}>Generating Your Certificate</h2>
          <p className={styles.loadingText}>Please wait while we prepare your certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" 
        onLoad={() => setHtml2pdfLoaded(true)}
      />
      
      <div className={styles.pageContainer}>
        <div className={styles.controls}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <ArrowLeft size={18} /> Back
          </button>
          <button 
            onClick={downloadPDF} 
            className={styles.downloadButton} 
            disabled={!html2pdfLoaded || !certificateData}
          >
            <Download size={18} /> Download PDF
          </button>
        </div>

        <div className={styles.certificateWrapper}>
          {/* Main Container */}
          <div ref={certificateRef} className={styles.certificateContainer}>
            <div className={styles.borderOuter}></div>
            <div className={styles.borderInner}></div>
            
            <div className={styles.certificateContent}>
              <div className={styles.header}>
                <BookOpen size={60} color="#1e3a8a" />
                <h2 className={styles.appName}>StackAcademy</h2>
                <div className={styles.titleUnderline}></div>
                <h1 className={styles.certificateTitle}>Certificate of Achievement</h1>
              </div>

              <div className={styles.mainContent}>
                <p className={styles.certifyText}>This is to certify that</p>
                <h2 className={styles.studentName}>{certificateData?.userName}</h2>
                <p className={styles.completionText}>has successfully completed the professional course</p>
                <h3 className={styles.courseTitle}>{certificateData?.courseTitle}</h3>
              </div>

              <div className={styles.footer}>
                <div className={styles.dateSection}>
                  <p className={styles.dateLabel}>Date of Completion</p>
                  <p className={styles.dateValue}>{certificateData?.completionDate}</p>
                </div>
                <div className={styles.idSection}>
                  <p className={styles.idLabel}>Verify Certificate ID</p>
                  <p className={styles.idValue}>{certificateData?.certificateId}</p>
                </div>
              </div>
              <div className={styles.watermark}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
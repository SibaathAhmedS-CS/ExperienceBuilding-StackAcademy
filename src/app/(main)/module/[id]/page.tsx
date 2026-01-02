'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  CheckCircle,
  Circle,
  Clock,
  BookOpen,
  Download,
  MessageSquare,
  FileText,
  Play,
  Lock,
  Award,
  ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import { useHeader } from '@/hooks/useHeader';
import { getCourseByLessonUid, getLessonByUid } from '@/lib/contentstack';
import { createClient } from '@/utils/supabase/client';
import { sendCourseCompletionWebhook } from '@/utils/webhook';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  CourseEntry, 
  ModuleEntry, 
  LessonEntry, 
  normalizeArray,
  isFileResource,
  isLinkResource
} from '@/types/contentstack';
import styles from './page.module.css';

// Mock user data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// Helper to format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to get file type from content_type
function getFileType(contentType?: string): string {
  if (!contentType) return 'file';
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('zip')) return 'zip';
  if (contentType.includes('image')) return 'image';
  if (contentType.includes('video')) return 'video';
  return contentType.split('/')[1] || 'file';
}

interface ProcessedLesson {
  uid: string;
  title: string;
  duration: string;
  completed: boolean;
  is_preview: boolean;
  videoUrl: string;
  content: string;
  resources: { title: string; type: string; url?: string; isLink?: boolean }[];
}

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'resources' | 'discussions'>('content');
  const [videoProgress, setVideoProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [currentLessonData, setCurrentLessonData] = useState<LessonEntry | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  
  const supabase = createClient();
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');
  
  // Language context for localized content
  const { selectedLanguage } = useLanguage();

  // Fetch course and lesson data from CMS, and lesson progress from DB
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setCurrentUserId(authUser.id);
        }
        
        // Fetch the lesson directly with locale
        const lesson = await getLessonByUid(lessonId, selectedLanguage);
        setCurrentLessonData(lesson);
        
        // Fetch the course that contains this lesson with locale
        const course = await getCourseByLessonUid(lessonId, selectedLanguage);
        setCourseData(course);
        
        // Check enrollment status
        if (authUser && course?.uid) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id, status')
            .eq('user_id', authUser.id)
            .eq('course_id', course.uid)
            .maybeSingle();
          
          if (enrollment) {
            setIsEnrolled(true);
            // Check if course is completed
            if (enrollment.status === 'completed') {
              setIsCourseCompleted(true);
            }
          }
          
          // Fetch completed lessons from DB
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
      } catch (error) {
        console.error('Error fetching lesson data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (lessonId) {
      fetchData();
    }
  }, [lessonId, supabase, selectedLanguage]);

  // Refresh completed lessons when a lesson is marked as complete
  useEffect(() => {
    async function refreshProgress() {
      if (!currentUserId || !courseData?.uid) return;
      
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', currentUserId)
        .eq('course_id', courseData.uid)
        .eq('is_completed', true);
      
      if (lessonProgress) {
        setCompletedLessonIds(lessonProgress.map(lp => lp.lesson_id));
      }
    }
    
    refreshProgress();
  }, [currentUserId, courseData?.uid, supabase]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(mockUser);
    }
  }, []);

  // Process course modules into flat lesson list
  const modules = normalizeArray(courseData?.modules);
  const allLessons: { moduleIndex: number; lessonIndex: number; uid: string; lesson: LessonEntry }[] = [];
  
  modules.forEach((module, mIndex) => {
    const lessons = normalizeArray(module.lessons);
    lessons.forEach((lesson, lIndex) => {
      allLessons.push({ moduleIndex: mIndex, lessonIndex: lIndex, uid: lesson.uid, lesson });
    });
  });

  // Helper: Check if a module is unlocked (first module or previous module is 100% complete)
  const isModuleUnlocked = (moduleIndex: number): boolean => {
    if (!isEnrolled || !currentUserId) {
      // If not enrolled, only preview lessons are accessible
      return false;
    }
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
    if (!isEnrolled || !currentUserId) return false;
    
    // Check if the module is unlocked
    return isModuleUnlocked(moduleIndex);
  };

  // Find current lesson position
  const currentIndex = allLessons.findIndex(l => l.uid === lessonId);
  const currentLessonInfo = allLessons[currentIndex];
  const currentModuleIndex = currentLessonInfo?.moduleIndex || 0;
  const currentLessonIndex = currentLessonInfo?.lessonIndex || 0;
  
  // Get prev/next lessons
  // For navigation buttons, we show next lesson even if not yet accessible
  // (user can mark current lesson complete and then access it)
  const getPrevNext = () => {
    let prev: typeof allLessons[0] | null = null;
    let next: typeof allLessons[0] | null = null;
    
    // Find previous lesson (prefer accessible ones, but show any if enrolled)
    for (let i = currentIndex - 1; i >= 0; i--) {
      const lessonInfo = allLessons[i];
      // Show previous lesson if accessible, or if enrolled (for same module)
      if (isLessonAccessible(lessonInfo.lesson, lessonInfo.moduleIndex) || 
          (isEnrolled && lessonInfo.moduleIndex === currentModuleIndex)) {
        prev = lessonInfo;
        break;
      }
    }
    
    // Find next lesson (show next lesson in sequence if enrolled, even if not accessible yet)
    // This allows users to see navigation buttons for text-based lessons
    for (let i = currentIndex + 1; i < allLessons.length; i++) {
      const lessonInfo = allLessons[i];
      // Show next lesson if:
      // 1. It's accessible, OR
      // 2. User is enrolled and it's in the same module (sequential access), OR
      // 3. User is enrolled and it's in the next module (will be accessible after completing current module)
      if (isLessonAccessible(lessonInfo.lesson, lessonInfo.moduleIndex) ||
          (isEnrolled && (lessonInfo.moduleIndex === currentModuleIndex || 
                          lessonInfo.moduleIndex === currentModuleIndex + 1))) {
        next = lessonInfo;
        break;
      }
    }
    
    return { prev, next };
  };

  const { prev: prevLessonInfo, next: nextLessonInfo } = getPrevNext();

  // Check if current lesson is the last lesson of its module
  const currentModule = modules[currentModuleIndex];
  const currentModuleLessons = currentModule ? normalizeArray(currentModule.lessons) : [];
  const isLastLessonInModule = currentLessonIndex === currentModuleLessons.length - 1;
  
  // Check if current module is the last module
  const isLastModule = currentModuleIndex === modules.length - 1;
  
  // Check if this is the very last lesson of the entire course
  const isLastLessonOfCourse = isLastModule && isLastLessonInModule;
  
  // Check if all lessons except the current one are completed (required to show Complete Course button)
  const allOtherLessonsCompleted = isLastLessonOfCourse && currentLessonData 
    ? allLessons.filter(l => l.uid !== currentLessonData.uid)
        .every(l => completedLessonIds.includes(l.uid))
    : false;
  
  // Show Complete Course button only if:
  // 1. It's the last lesson of the course
  // 2. All other lessons are completed
  // 3. Course is not already completed
  const canCompleteCourse = isLastLessonOfCourse && allOtherLessonsCompleted && !isCourseCompleted;
  
  // Get next module's first lesson (if exists)
  // Show it if accessible, or if enrolled (user can complete current module to unlock it)
  const getNextModuleFirstLesson = (): typeof allLessons[0] | null => {
    if (isLastModule) return null;
    
    const nextModuleIndex = currentModuleIndex + 1;
    if (nextModuleIndex >= modules.length) return null;
    
    const nextModule = modules[nextModuleIndex];
    const nextModuleLessons = normalizeArray(nextModule.lessons);
    
    if (nextModuleLessons.length > 0) {
      const firstLesson = nextModuleLessons[0];
      const firstLessonInfo = allLessons.find(l => l.uid === firstLesson.uid);
      
      // Show next module's first lesson if accessible, or if enrolled (sequential access)
      if (firstLessonInfo && (isLessonAccessible(firstLessonInfo.lesson, nextModuleIndex) || isEnrolled)) {
        return firstLessonInfo;
      }
    }
    
    return null;
  };

  const nextModuleFirstLesson = getNextModuleFirstLesson();

  // Calculate progress from DB
  const totalLessons = allLessons.length;
  const completedLessons = completedLessonIds.length;
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Process current lesson for display
  const currentLesson: ProcessedLesson | null = currentLessonData ? {
    uid: currentLessonData.uid,
    title: currentLessonData.title,
    duration: currentLessonData.duration || '15:00',
    completed: completedLessonIds.includes(currentLessonData.uid),
    is_preview: currentLessonData.is_preview || false,
    videoUrl: currentLessonData.video_url?.href || '',
    content: currentLessonData.lesson_content || '',
    resources: (currentLessonData.resources || []).map(res => {
      if (isFileResource(res)) {
        return {
          title: res.file_resource.resource_label || 'Resource',
          type: getFileType(res.file_resource.resource_file?.content_type),
          url: res.file_resource.resource_file?.url,
          isLink: false
        };
      } else if (isLinkResource(res)) {
        return {
          title: res.link_resource.resource_label || res.link_resource.resource_link?.title || 'Link',
          type: 'link',
          url: res.link_resource.resource_link?.href,
          isLink: true
        };
      }
      return { title: 'Resource', type: 'unknown', size: '' };
    })
  } : null;

  const handleVideoProgress = (progress: number) => {
    setVideoProgress(progress);
  };

  // Check if course is completed and update enrollment status
  // This should ONLY be called when the user clicks "Complete Course" button
  const checkAndUpdateCourseCompletion = async (shouldRedirect: boolean = false) => {
    if (!currentUserId || !courseData) return false;
    
    try {
      const modules = normalizeArray(courseData.modules);
      let totalLessons = 0;
      modules.forEach(module => {
        totalLessons += normalizeArray(module.lessons).length;
      });

      // Get completed lessons count (including the current lesson that was just marked)
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', currentUserId)
        .eq('course_id', courseData.uid)
        .eq('is_completed', true);

      const completedLessons = lessonProgress?.length || 0;
      const wasAlreadyCompleted = isCourseCompleted;
      const isCourseCompletedNow = totalLessons > 0 && completedLessons === totalLessons;

      // Only update enrollment status if course is completed AND it wasn't already completed
      if (isCourseCompletedNow && !wasAlreadyCompleted) {
        // First, get the enrollment ID before updating
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('course_id', courseData.uid)
          .maybeSingle();

        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('user_id', currentUserId)
          .eq('course_id', courseData.uid);

        if (enrollmentError) {
          console.error('Error updating enrollment status:', enrollmentError);
          return false;
        } else {
          console.log('✅ Course completed! Enrollment status updated to completed.');
          setIsCourseCompleted(true);
          
          // Send webhook notification to Contentstack Automate
          try {
            // Fetch user profile data (email and name)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle();

              const userName = profile?.full_name || user.email?.split('@')[0] || 'Student';
              const userEmail = user.email || '';
              
              // Generate certificate URL using enrollment ID
              const enrollmentId = enrollmentData?.id;
              if (enrollmentId) {
                const certificateUrl = `${window.location.origin}/certificate/${enrollmentId}`;
                
                // Send webhook asynchronously (don't block redirect)
                sendCourseCompletionWebhook({
                  email: userEmail,
                  name: userName,
                  courseName: courseData.title,
                  certificateUrl: certificateUrl,
                }).catch(error => {
                  console.error('Failed to send webhook (non-blocking):', error);
                });
              } else {
                console.warn('⚠️ Enrollment ID not found, skipping webhook');
              }
            }
          } catch (webhookError) {
            // Don't block the completion flow if webhook fails
            console.error('Error preparing webhook data:', webhookError);
          }
          
          // Redirect to completion success page if redirect is requested
          if (shouldRedirect && courseData.slug) {
            setTimeout(() => {
              router.push(`/course/${courseData.slug}/completion-success`);
            }, 500); // Small delay to ensure state is updated
          }
          return true;
        }
      } else if (isCourseCompletedNow) {
        setIsCourseCompleted(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking course completion:', error);
      return false;
    }
  };

  const markLessonAsCompleted = async (lessonUid: string) => {
    if (!currentUserId || !courseData) return;
    
    // Don't mark again if already completed
    if (completedLessonIds.includes(lessonUid)) {
      return;
    }
    
    try {
      // Find the module containing this lesson
      const modules = normalizeArray(courseData.modules);
      let moduleId = '';
      
      for (const module of modules) {
        const lessons = normalizeArray(module.lessons);
        if (lessons.some(l => l.uid === lessonUid)) {
          moduleId = module.uid;
          break;
        }
      }
      
      if (!moduleId) {
        console.error('Module not found for lesson');
        return;
      }
      
      // Upsert lesson progress
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: currentUserId,
          course_id: courseData.uid,
          module_id: moduleId,
          lesson_id: lessonUid,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id'
        });
      
      if (error) {
        console.error('Error marking lesson as completed:', error);
      } else {
        // Update local state immediately for UI feedback
        setCompletedLessonIds(prev => {
          if (!prev.includes(lessonUid)) {
            return [...prev, lessonUid];
          }
          return prev;
        });
        console.log('✅ Lesson marked as completed:', lessonUid);
      }
    } catch (error) {
      console.error('Error in markLessonAsCompleted:', error);
    }
  };

  const handleVideoComplete = async () => {
    // Mark lesson as complete when video ends or user skips to last second
    if (currentLessonData && currentLessonData.video_url?.href) {
      await markLessonAsCompleted(currentLessonData.uid);
    }
  };

  const handleNextLesson = async () => {
    // For text-based courses, mark as complete when Next is pressed
    if (currentLessonData && !currentLessonData.video_url?.href) {
      await markLessonAsCompleted(currentLessonData.uid);
    }
    
    // Navigate to next lesson if available
    if (nextLessonInfo) {
      // Navigation will happen via Link href
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} />
        <div className={styles.moduleLayout}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading lesson...</p>
          </div>
        </div>
      </>
    );
  }

  if (!currentLesson) {
    return (
      <div className={styles.notFound}>
        <h1>Lesson not found</h1>
        <Link href="/home">Go back home</Link>
      </div>
    );
  }

  // Check if current lesson is accessible
  const currentLessonInfoForAccess = allLessons.find(l => l.uid === lessonId);
  const isCurrentLessonAccessible = currentLessonInfoForAccess 
    ? isLessonAccessible(currentLessonInfoForAccess.lesson, currentLessonInfoForAccess.moduleIndex)
    : false;

  // If lesson is not accessible and not a preview, redirect or show locked message
  if (!isCurrentLessonAccessible && currentLessonInfoForAccess && !currentLessonInfoForAccess.lesson.is_preview) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} />
        <div className={styles.moduleLayout}>
          <div className={styles.notFound}>
            <Lock size={48} style={{ color: 'var(--neutral-400)', marginBottom: '16px' }} />
            <h1>Lesson Locked</h1>
            <p>You need to complete the previous module to access this lesson.</p>
            <Link href={`/course/${courseData?.slug || 'machine-learning-python'}`} className={styles.backToCourseBtn}>
              Back to Course
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} />

      <div className={styles.moduleLayout}>
        {/* Sidebar Toggle for Mobile */}
        <button
          className={styles.sidebarToggle}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Sidebar - CMS Data */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarHeader}>
            <Link href={`/course/${courseData?.slug || 'machine-learning-python'}`} className={styles.backLink}>
              <ChevronLeft size={20} />
              <span>Back to course</span>
            </Link>
            <h2 className={styles.courseTitle}>{courseData?.title || 'Course'}</h2>
            
            {/* Progress - From DB */}
            <div className={styles.progressBar}>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
              <span className={styles.progressText}>
                {courseProgress}% complete ({completedLessons}/{totalLessons} lessons)
              </span>
            </div>
          </div>

          <div className={styles.modulesList}>
            {modules.map((module, moduleIndex) => {
              const moduleLessons = normalizeArray(module.lessons);
              const moduleCompletedCount = moduleLessons.filter(l => completedLessonIds.includes(l.uid)).length;
              const isUnlocked = isModuleUnlocked(moduleIndex);
              const isModuleLocked = isEnrolled && currentUserId && !isUnlocked;
              
              return (
                <div 
                  key={module.uid} 
                  className={`${styles.moduleGroup} ${isModuleLocked ? styles.moduleLocked : ''}`}
                >
                  <div className={styles.moduleHeader}>
                    <h3>
                      {isModuleLocked && <Lock size={14} className={styles.moduleLockIcon} />}
                      {module.title}
                    </h3>
                    <span className={styles.moduleProgress}>
                      {moduleCompletedCount}/{moduleLessons.length}
                    </span>
                  </div>
                  
                  <div className={styles.lessonsList}>
                    {moduleLessons.map((lesson) => {
                      const isCompleted = completedLessonIds.includes(lesson.uid);
                      const isCurrent = lesson.uid === lessonId;
                      const isAccessible = isLessonAccessible(lesson, moduleIndex);
                      
                      return (
                        <Link
                          key={lesson.uid}
                          href={isAccessible ? `/module/${lesson.uid}` : '#'}
                          className={`${styles.lessonLink} ${isCurrent ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${!isAccessible ? styles.locked : ''}`}
                          onClick={(e) => {
                            if (!isAccessible) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <span className={styles.lessonStatus}>
                            {isCompleted ? (
                              <CheckCircle size={18} className={styles.completedIcon} />
                            ) : !isAccessible ? (
                              <Lock size={18} />
                            ) : isCurrent ? (
                              <Play size={18} />
                            ) : (
                              <Circle size={18} />
                            )}
                          </span>
                          <span className={styles.lessonTitle}>{lesson.title}</span>
                          <span className={styles.lessonDuration}>{lesson.duration || '15:00'}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Certificate Banner */}
          <div className={styles.certificateBanner}>
            <Award size={24} />
            <div>
              <h4>Earn Certificate</h4>
              <p>Complete all lessons to get your certificate</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Video Player - Only show if lesson has a video */}
          {currentLesson.videoUrl && (
            <div className={styles.videoSection}>
              <VideoPlayer
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                onProgress={handleVideoProgress}
                onComplete={handleVideoComplete}
              />
            </div>
          )}

          {/* Lesson Navigation */}
          <div className={styles.lessonNav}>
            {prevLessonInfo ? (
              <Link
                href={`/module/${prevLessonInfo.uid}`}
                className={styles.navBtn}
              >
                <ChevronLeft size={20} />
                <span>Previous</span>
              </Link>
            ) : (
              <div />
            )}

            <div className={styles.lessonInfo}>
              <h1>{currentLesson.title}</h1>
              <p>
                Module {currentModuleIndex + 1}, Lesson {currentLessonIndex + 1} •{' '}
                <Clock size={14} /> {currentLesson.duration}
              </p>
            </div>

            {isLastLessonOfCourse && isCourseCompleted ? (
              // Course already completed - Show message
              <div className={styles.courseCompletedMessage}>
                <Award size={20} />
                <span>Course Completed!</span>
              </div>
            ) : isLastLessonOfCourse ? (
              // Last lesson of last module - Show "Complete Course" button (enabled or disabled)
              <button 
                className={`${styles.navBtn} ${styles.navBtnComplete} ${!allOtherLessonsCompleted ? styles.disabled : ''}`}
                disabled={!allOtherLessonsCompleted}
                onClick={async () => {
                  if (currentLessonData && allOtherLessonsCompleted) {
                    // First, mark the current lesson as completed
                    await markLessonAsCompleted(currentLessonData.uid);
                    
                    // Wait a bit for the database update to complete
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Then check if all lessons are completed and update enrollment/redirect
                    // Since we already verified all other lessons are completed, this should succeed
                    await checkAndUpdateCourseCompletion(true);
                  }
                }}
                title={!allOtherLessonsCompleted ? "Complete all lessons to complete the course" : ""}
              >
                <Award size={20} />
                <span>Complete Course</span>
              </button>
            ) : isLastLessonInModule && nextModuleFirstLesson ? (
              // Last lesson of module (but not last module) - Show "Move to Next Module"
              <Link
                href={`/module/${nextModuleFirstLesson.uid}`}
                className={`${styles.navBtn} ${styles.navBtnNextModule}`}
                onClick={handleNextLesson}
              >
                <span>Move to Next Module</span>
                <ChevronRight size={20} />
              </Link>
            ) : nextLessonInfo ? (
              // Regular next lesson - Show "Next Lesson"
              <Link
                href={`/module/${nextLessonInfo.uid}`}
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={handleNextLesson}
              >
                <span>Next Lesson</span>
                <ChevronRight size={20} />
              </Link>
            ) : (
              // Fallback - no navigation available
              <div />
            )}
          </div>

          {/* Content Tabs */}
          <div className={styles.contentSection}>
            <div className={styles.tabsHeader}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'content' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <BookOpen size={18} />
                Lesson Content
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'resources' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                <Download size={18} />
                Resources
                {currentLesson.resources.length > 0 && (
                  <span className={styles.tabBadge}>{currentLesson.resources.length}</span>
                )}
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'discussions' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('discussions')}
              >
                <MessageSquare size={18} />
                Discussions
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'content' && (
                <div 
                  className={styles.lessonContent}
                  dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                />
              )}

              {activeTab === 'resources' && (
                <div className={styles.resourcesList}>
                  {currentLesson.resources.length > 0 ? (
                    currentLesson.resources.map((resource, index) => (
                      <div key={index} className={styles.resourceItem}>
                        {resource.isLink ? <ExternalLink size={24} /> : <FileText size={24} />}
                        <div className={styles.resourceInfo}>
                          <h4>{resource.title}</h4>
                          <span>
                            {resource.type.toUpperCase()}
                          </span>
                        </div>
                        {resource.isLink ? (
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.downloadBtn}
                          >
                            <ExternalLink size={18} />
                            Open
                          </a>
                        ) : (
                          <a 
                            href={resource.url} 
                            download
                            className={styles.downloadBtn}
                          >
                            <Download size={18} />
                            Download
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <FileText size={48} />
                      <p>No resources available for this lesson.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'discussions' && (
                <div className={styles.discussions}>
                  <div className={styles.emptyState}>
                    <MessageSquare size={48} />
                    <p>No discussions yet. Be the first to start a conversation!</p>
                    <button className={styles.startDiscussionBtn}>
                      Start Discussion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}


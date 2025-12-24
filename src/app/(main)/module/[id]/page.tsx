'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  resources: { title: string; type: string; size: string; url?: string; isLink?: boolean }[];
}

export default function ModulePage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'resources' | 'discussions'>('content');
  const [videoProgress, setVideoProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [courseData, setCourseData] = useState<CourseEntry | null>(null);
  const [currentLessonData, setCurrentLessonData] = useState<LessonEntry | null>(null);
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');

  // Fetch course and lesson data from CMS
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch the lesson directly
        const lesson = await getLessonByUid(lessonId);
        setCurrentLessonData(lesson);
        
        // Fetch the course that contains this lesson
        const course = await getCourseByLessonUid(lessonId);
        setCourseData(course);
      } catch (error) {
        console.error('Error fetching lesson data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (lessonId) {
      fetchData();
    }
  }, [lessonId]);

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

  // Find current lesson position
  const currentIndex = allLessons.findIndex(l => l.uid === lessonId);
  const currentLessonInfo = allLessons[currentIndex];
  const currentModuleIndex = currentLessonInfo?.moduleIndex || 0;
  const currentLessonIndex = currentLessonInfo?.lessonIndex || 0;
  
  // Get prev/next lessons
  const prevLessonInfo = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLessonInfo = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Calculate progress (dummy - will come from DB)
  const totalLessons = allLessons.length;
  const completedLessons = 2; // Dummy - from DB
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Process current lesson for display
  const currentLesson: ProcessedLesson | null = currentLessonData ? {
    uid: currentLessonData.uid,
    title: currentLessonData.title,
    duration: currentLessonData.duration || '15:00',
    completed: false, // From DB
    is_preview: currentLessonData.is_preview || false,
    videoUrl: currentLessonData.video_url?.href || '',
    content: currentLessonData.lesson_content || '',
    resources: (currentLessonData.resources || []).map(res => {
      if (isFileResource(res)) {
        return {
          title: res.file_resource.resource_label || 'Resource',
          type: getFileType(res.file_resource.resource_file?.content_type),
          size: formatFileSize(res.file_resource.resource_file?.file_size as unknown as number),
          url: res.file_resource.resource_file?.url,
          isLink: false
        };
      } else if (isLinkResource(res)) {
        return {
          title: res.link_resource.resource_label || res.link_resource.resource_link?.title || 'Link',
          type: 'link',
          size: '',
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

  const handleVideoComplete = () => {
    // Mark lesson as complete - will call DB API
    console.log('Video completed');
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
            
            {/* Progress - DB Data (Dummy) */}
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
            {modules.map((module) => {
              const moduleLessons = normalizeArray(module.lessons);
              return (
                <div key={module.uid} className={styles.moduleGroup}>
                  <div className={styles.moduleHeader}>
                    <h3>{module.title}</h3>
                    <span className={styles.moduleProgress}>
                      0/{moduleLessons.length}
                    </span>
                  </div>
                  
                  <div className={styles.lessonsList}>
                    {moduleLessons.map((lesson) => (
                      <Link
                        key={lesson.uid}
                        href={`/module/${lesson.uid}`}
                        className={`${styles.lessonLink} ${lesson.uid === lessonId ? styles.active : ''}`}
                      >
                        <span className={styles.lessonStatus}>
                          {lesson.uid === lessonId ? (
                            <Play size={18} />
                          ) : (
                            <Circle size={18} />
                          )}
                        </span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        <span className={styles.lessonDuration}>{lesson.duration || '15:00'}</span>
                      </Link>
                    ))}
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

            {nextLessonInfo ? (
              <Link
                href={`/module/${nextLessonInfo.uid}`}
                className={`${styles.navBtn} ${styles.navBtnNext}`}
              >
                <span>Next</span>
                <ChevronRight size={20} />
              </Link>
            ) : (
              <button className={`${styles.navBtn} ${styles.navBtnComplete}`}>
                <Award size={20} />
                <span>Complete Course</span>
              </button>
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
                            {resource.size && ` • ${resource.size}`}
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


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
  Award
} from 'lucide-react';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import { useHeader } from '@/hooks/useHeader';
import styles from './page.module.css';

// Mock user data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// Mock course and module data - Replace with Contentstack data
const courseData = {
  uid: 'course-1',
  title: 'Machine Learning with Python',
  slug: 'machine-learning-python',
  modules: [
    {
      uid: 'mod-1',
      title: 'Introduction to Machine Learning',
      lessons: [
        { 
          uid: 'les-1', 
          title: 'What is Machine Learning?', 
          duration: '15:00', 
          completed: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          content: `
            <h2>What is Machine Learning?</h2>
            <p>Machine Learning (ML) is a subset of artificial intelligence (AI) that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.</p>
            
            <h3>Key Concepts</h3>
            <ul>
              <li><strong>Training Data:</strong> The dataset used to train the model</li>
              <li><strong>Features:</strong> The input variables used to make predictions</li>
              <li><strong>Labels:</strong> The output variable we want to predict</li>
              <li><strong>Model:</strong> The mathematical function that maps features to labels</li>
            </ul>
            
            <h3>Types of Machine Learning</h3>
            <p>There are three main types of machine learning:</p>
            <ol>
              <li><strong>Supervised Learning:</strong> Learning from labeled data</li>
              <li><strong>Unsupervised Learning:</strong> Finding patterns in unlabeled data</li>
              <li><strong>Reinforcement Learning:</strong> Learning through trial and error</li>
            </ol>
          `,
          resources: [
            { title: 'Lecture Slides', type: 'pdf', size: '2.5 MB' },
            { title: 'Code Examples', type: 'zip', size: '1.2 MB' },
          ],
        },
        { 
          uid: 'les-2', 
          title: 'Types of Machine Learning', 
          duration: '20:00', 
          completed: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          content: '<h2>Types of Machine Learning</h2><p>This lesson covers supervised, unsupervised, and reinforcement learning in detail.</p>',
          resources: [],
        },
        { 
          uid: 'les-3', 
          title: 'Setting Up Your Environment', 
          duration: '25:00', 
          completed: false,
          videoUrl: '',
          content: '<h2>Setting Up Your Environment</h2><p>Learn how to set up Python, Jupyter, and essential ML libraries.</p>',
          resources: [],
        },
        { 
          uid: 'les-4', 
          title: 'Your First ML Model', 
          duration: '30:00', 
          completed: false,
          videoUrl: '',
          content: '<h2>Your First ML Model</h2><p>Build your first machine learning model step by step.</p>',
          resources: [],
        },
      ],
    },
    {
      uid: 'mod-2',
      title: 'Supervised Learning',
      lessons: [
        { uid: 'les-5', title: 'Linear Regression', duration: '45:00', completed: false, videoUrl: '', content: '', resources: [] },
        { uid: 'les-6', title: 'Logistic Regression', duration: '40:00', completed: false, videoUrl: '', content: '', resources: [] },
        { uid: 'les-7', title: 'Decision Trees', duration: '35:00', completed: false, videoUrl: '', content: '', resources: [] },
      ],
    },
    {
      uid: 'mod-3',
      title: 'Deep Learning Fundamentals',
      lessons: [
        { uid: 'les-8', title: 'Introduction to Neural Networks', duration: '50:00', completed: false, videoUrl: '', content: '', resources: [] },
        { uid: 'les-9', title: 'Building Your First Neural Network', duration: '60:00', completed: false, videoUrl: '', content: '', resources: [] },
      ],
    },
  ],
};

interface Lesson {
  uid: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  content: string;
  resources: { title: string; type: string; size: string }[];
}

export default function ModulePage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'resources' | 'discussions'>('content');
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');

  // Find current lesson
  let currentLesson: Lesson | null = null;
  let currentModuleIndex = 0;
  let currentLessonIndex = 0;
  let prevLesson: { moduleIndex: number; lessonIndex: number } | null = null;
  let nextLesson: { moduleIndex: number; lessonIndex: number } | null = null;

  courseData.modules.forEach((module, mIndex) => {
    module.lessons.forEach((lesson, lIndex) => {
      if (lesson.uid === lessonId) {
        currentLesson = lesson;
        currentModuleIndex = mIndex;
        currentLessonIndex = lIndex;
      }
    });
  });

  // Calculate prev/next lessons
  const allLessons: { moduleIndex: number; lessonIndex: number; uid: string }[] = [];
  courseData.modules.forEach((module, mIndex) => {
    module.lessons.forEach((lesson, lIndex) => {
      allLessons.push({ moduleIndex: mIndex, lessonIndex: lIndex, uid: lesson.uid });
    });
  });

  const currentIndex = allLessons.findIndex(l => l.uid === lessonId);
  if (currentIndex > 0) {
    prevLesson = allLessons[currentIndex - 1];
  }
  if (currentIndex < allLessons.length - 1) {
    nextLesson = allLessons[currentIndex + 1];
  }

  // Calculate progress
  const totalLessons = allLessons.length;
  const completedLessons = courseData.modules.reduce(
    (acc, mod) => acc + mod.lessons.filter(l => l.completed).length,
    0
  );
  const courseProgress = Math.round((completedLessons / totalLessons) * 100);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(mockUser);
    }
  }, []);

  const handleVideoProgress = (progress: number) => {
    setVideoProgress(progress);
  };

  const handleVideoComplete = () => {
    // Mark lesson as complete
    console.log('Video completed');
  };

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

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarHeader}>
            <Link href={`/course/${courseData.slug}`} className={styles.backLink}>
              <ChevronLeft size={20} />
              <span>Back to course</span>
            </Link>
            <h2 className={styles.courseTitle}>{courseData.title}</h2>
            
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
            {courseData.modules.map((module, mIndex) => (
              <div key={module.uid} className={styles.moduleGroup}>
                <div className={styles.moduleHeader}>
                  <h3>{module.title}</h3>
                  <span className={styles.moduleProgress}>
                    {module.lessons.filter(l => l.completed).length}/{module.lessons.length}
                  </span>
                </div>
                
                <div className={styles.lessonsList}>
                  {module.lessons.map((lesson, lIndex) => (
                    <Link
                      key={lesson.uid}
                      href={`/module/${lesson.uid}`}
                      className={`${styles.lessonLink} ${lesson.uid === lessonId ? styles.active : ''} ${lesson.completed ? styles.completed : ''}`}
                    >
                      <span className={styles.lessonStatus}>
                        {lesson.completed ? (
                          <CheckCircle size={18} />
                        ) : lesson.uid === lessonId ? (
                          <Play size={18} />
                        ) : (
                          <Circle size={18} />
                        )}
                      </span>
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                      <span className={styles.lessonDuration}>{lesson.duration}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
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
          {/* Video Player */}
          <div className={styles.videoSection}>
            {currentLesson.videoUrl ? (
              <VideoPlayer
                src={currentLesson.videoUrl}
                title={currentLesson.title}
                onProgress={handleVideoProgress}
                onComplete={handleVideoComplete}
              />
            ) : (
              <div className={styles.videoPlaceholder}>
                <Lock size={48} />
                <p>This lesson is locked. Complete previous lessons to unlock.</p>
              </div>
            )}
          </div>

          {/* Lesson Navigation */}
          <div className={styles.lessonNav}>
            {prevLesson ? (
              <Link
                href={`/module/${courseData.modules[prevLesson.moduleIndex].lessons[prevLesson.lessonIndex].uid}`}
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

            {nextLesson ? (
              <Link
                href={`/module/${courseData.modules[nextLesson.moduleIndex].lessons[nextLesson.lessonIndex].uid}`}
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
                        <FileText size={24} />
                        <div className={styles.resourceInfo}>
                          <h4>{resource.title}</h4>
                          <span>{resource.type.toUpperCase()} • {resource.size}</span>
                        </div>
                        <button className={styles.downloadBtn}>
                          <Download size={18} />
                          Download
                        </button>
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


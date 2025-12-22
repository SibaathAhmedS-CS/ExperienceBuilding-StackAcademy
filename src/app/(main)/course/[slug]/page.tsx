'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
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
  Share2,
  Heart,
  ChevronDown,
  Lock,
  PlayCircle
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import FAQ from '@/components/FAQ';
import { useHeader } from '@/hooks/useHeader';
import styles from './page.module.css';

// Mock user data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// Mock course data - Replace with Contentstack data
const courseData = {
  uid: 'course-1',
  title: 'Machine Learning with Python',
  slug: 'machine-learning-python',
  shortDescription: 'Master machine learning from scratch with Python. Build real-world ML models and deploy them to production.',
  description: `
    <p>This comprehensive course will take you from a complete beginner to a proficient machine learning practitioner. You'll learn the fundamental concepts of machine learning, including supervised and unsupervised learning, deep learning, and neural networks.</p>
    
    <p>By the end of this course, you'll have built multiple real-world projects that you can showcase in your portfolio, including:</p>
    <ul>
      <li>A spam detection system using Natural Language Processing</li>
      <li>An image classification model using Convolutional Neural Networks</li>
      <li>A recommendation engine for e-commerce</li>
      <li>A stock price prediction model using Time Series Analysis</li>
    </ul>
    
    <p>Whether you're a programmer looking to transition into ML, a data analyst wanting to expand your skills, or a complete beginner, this course has something for you.</p>
  `,
  heroImage: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200',
  thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600',
  instructor: {
    name: 'Michael Chen',
    title: 'Senior ML Engineer at Google',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    bio: 'Michael has over 10 years of experience in machine learning and has worked on some of the most impactful ML projects at Google.',
    coursesCount: 12,
    studentsCount: 145000,
    rating: 4.8,
  },
  level: 'intermediate',
  duration: '38 hours',
  rating: 4.8,
  reviewsCount: 8900,
  studentsEnrolled: 28000,
  language: 'English',
  lastUpdated: 'December 2024',
  outcomes: [
    'Understand the mathematical foundations of machine learning',
    'Build and train supervised learning models',
    'Implement deep learning models using TensorFlow and Keras',
    'Apply NLP techniques for text processing',
    'Deploy ML models to production',
    'Work with real-world datasets and solve practical problems',
  ],
  requirements: [
    'Basic Python programming knowledge',
    'Understanding of basic mathematics (algebra, statistics)',
    'A computer with internet access',
    'No prior ML experience required',
  ],
  modules: [
    {
      uid: 'mod-1',
      title: 'Introduction to Machine Learning',
      description: 'Learn the fundamentals of ML and set up your development environment.',
      duration: '2 hours',
      lessons: [
        { uid: 'les-1', title: 'What is Machine Learning?', duration: '15:00', isPreview: true },
        { uid: 'les-2', title: 'Types of Machine Learning', duration: '20:00', isPreview: true },
        { uid: 'les-3', title: 'Setting Up Your Environment', duration: '25:00', isPreview: false },
        { uid: 'les-4', title: 'Your First ML Model', duration: '30:00', isPreview: false },
      ],
    },
    {
      uid: 'mod-2',
      title: 'Supervised Learning',
      description: 'Master regression and classification algorithms.',
      duration: '6 hours',
      lessons: [
        { uid: 'les-5', title: 'Linear Regression', duration: '45:00', isPreview: false },
        { uid: 'les-6', title: 'Logistic Regression', duration: '40:00', isPreview: false },
        { uid: 'les-7', title: 'Decision Trees', duration: '35:00', isPreview: false },
        { uid: 'les-8', title: 'Random Forests', duration: '50:00', isPreview: false },
        { uid: 'les-9', title: 'Support Vector Machines', duration: '45:00', isPreview: false },
      ],
    },
    {
      uid: 'mod-3',
      title: 'Deep Learning Fundamentals',
      description: 'Dive into neural networks and deep learning.',
      duration: '8 hours',
      lessons: [
        { uid: 'les-10', title: 'Introduction to Neural Networks', duration: '50:00', isPreview: false },
        { uid: 'les-11', title: 'Building Your First Neural Network', duration: '60:00', isPreview: false },
        { uid: 'les-12', title: 'Activation Functions', duration: '35:00', isPreview: false },
        { uid: 'les-13', title: 'Backpropagation', duration: '55:00', isPreview: false },
        { uid: 'les-14', title: 'Optimizers and Learning Rates', duration: '45:00', isPreview: false },
      ],
    },
    {
      uid: 'mod-4',
      title: 'Convolutional Neural Networks',
      description: 'Master image recognition and computer vision.',
      duration: '7 hours',
      lessons: [
        { uid: 'les-15', title: 'CNN Architecture', duration: '55:00', isPreview: false },
        { uid: 'les-16', title: 'Image Classification Project', duration: '90:00', isPreview: false },
        { uid: 'les-17', title: 'Transfer Learning', duration: '45:00', isPreview: false },
        { uid: 'les-18', title: 'Object Detection', duration: '60:00', isPreview: false },
      ],
    },
    {
      uid: 'mod-5',
      title: 'Natural Language Processing',
      description: 'Learn to process and analyze text data.',
      duration: '6 hours',
      lessons: [
        { uid: 'les-19', title: 'Text Preprocessing', duration: '40:00', isPreview: false },
        { uid: 'les-20', title: 'Word Embeddings', duration: '50:00', isPreview: false },
        { uid: 'les-21', title: 'Sentiment Analysis Project', duration: '75:00', isPreview: false },
        { uid: 'les-22', title: 'Transformers and BERT', duration: '60:00', isPreview: false },
      ],
    },
    {
      uid: 'mod-6',
      title: 'Model Deployment',
      description: 'Deploy your models to production.',
      duration: '5 hours',
      lessons: [
        { uid: 'les-23', title: 'Saving and Loading Models', duration: '30:00', isPreview: false },
        { uid: 'les-24', title: 'Flask API for ML Models', duration: '60:00', isPreview: false },
        { uid: 'les-25', title: 'Docker Containerization', duration: '45:00', isPreview: false },
        { uid: 'les-26', title: 'Cloud Deployment', duration: '75:00', isPreview: false },
      ],
    },
  ],
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

const recommendedCourses = [
  {
    uid: '1',
    title: 'Deep Learning Specialization',
    slug: 'deep-learning-specialization',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600',
    instructorName: 'Andrew Ng',
    level: 'advanced' as const,
    duration: '45 hours',
    rating: 4.9,
    reviewsCount: 15000,
    studentsEnrolled: 85000,
  },
  {
    uid: '2',
    title: 'TensorFlow Developer Certificate',
    slug: 'tensorflow-developer',
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600',
    instructorName: 'Laurence Moroney',
    level: 'intermediate' as const,
    duration: '32 hours',
    rating: 4.8,
    reviewsCount: 8500,
    studentsEnrolled: 42000,
  },
  {
    uid: '3',
    title: 'Python for Data Analysis',
    slug: 'python-data-analysis',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Jose Portilla',
    level: 'beginner' as const,
    duration: '28 hours',
    rating: 4.7,
    reviewsCount: 12000,
    studentsEnrolled: 65000,
  },
  {
    uid: '4',
    title: 'MLOps Engineering',
    slug: 'mlops-engineering',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600',
    instructorName: 'Noah Gift',
    level: 'advanced' as const,
    duration: '35 hours',
    rating: 4.8,
    reviewsCount: 3200,
    studentsEnrolled: 15000,
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

type TabType = 'about' | 'outcomes' | 'modules' | 'reviews';

export default function CoursePage() {
  const params = useParams();
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [expandedModules, setExpandedModules] = useState<string[]>(['mod-1']);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
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

  const totalLessons = courseData.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <Image
              src={courseData.heroImage}
              alt={courseData.title}
              fill
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.breadcrumb}>
                <Link href="/home">Home</Link>
                <span>/</span>
                <Link href="/courses">Courses</Link>
                <span>/</span>
                <span>Data Science</span>
              </div>

              <h1 className={styles.courseTitle}>{courseData.title}</h1>
              <p className={styles.courseDescription}>{courseData.shortDescription}</p>

              <div className={styles.courseMeta}>
                <div className={styles.rating}>
                  <Star size={18} fill="var(--warning-500)" stroke="var(--warning-500)" />
                  <span className={styles.ratingValue}>{courseData.rating}</span>
                  <span className={styles.reviewsCount}>({courseData.reviewsCount.toLocaleString()} reviews)</span>
                </div>
                <div className={styles.metaItem}>
                  <Users size={18} />
                  <span>{courseData.studentsEnrolled.toLocaleString()} students</span>
                </div>
                <div className={styles.metaItem}>
                  <Clock size={18} />
                  <span>{courseData.duration}</span>
                </div>
                <div className={styles.metaItem}>
                  <Globe size={18} />
                  <span>{courseData.language}</span>
                </div>
              </div>

              <div className={styles.instructor}>
                <div className={styles.instructorAvatar}>
                  <Image src={courseData.instructor.avatar} alt={courseData.instructor.name} fill />
                </div>
                <div className={styles.instructorInfo}>
                  <span className={styles.createdBy}>Created by</span>
                  <span className={styles.instructorName}>{courseData.instructor.name}</span>
                </div>
              </div>
            </div>

            {/* Enrollment Card */}
            <div className={styles.enrollCard}>
              <div className={styles.cardPreview}>
                <Image
                  src={courseData.thumbnail}
                  alt={courseData.title}
                  fill
                  className={styles.cardImage}
                />
                <button className={styles.previewBtn}>
                  <PlayCircle size={48} />
                  <span>Preview Course</span>
                </button>
              </div>

              <div className={styles.cardContent}>
                <Link href={`/module/les-1`} className={styles.enrollBtn}>
                  Start Learning
                </Link>

                <button 
                  className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlisted : ''}`}
                  onClick={() => setIsWishlisted(!isWishlisted)}
                >
                  <Heart size={20} fill={isWishlisted ? 'var(--error-500)' : 'none'} />
                  {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                </button>

                <div className={styles.cardFeatures}>
                  <div className={styles.feature}>
                    <Clock size={18} />
                    <span>{courseData.duration} of content</span>
                  </div>
                  <div className={styles.feature}>
                    <BookOpen size={18} />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <div className={styles.feature}>
                    <Download size={18} />
                    <span>Downloadable resources</span>
                  </div>
                  <div className={styles.feature}>
                    <Award size={18} />
                    <span>Certificate of completion</span>
                  </div>
                  <div className={styles.feature}>
                    <FileText size={18} />
                    <span>Lifetime access</span>
                  </div>
                </div>

                <button className={styles.shareBtn}>
                  <Share2 size={18} />
                  Share
                </button>
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
              {/* About Section */}
              <section ref={aboutRef} className={styles.section}>
                <h2>About This Course</h2>
                <div 
                  className={styles.description}
                  dangerouslySetInnerHTML={{ __html: courseData.description }}
                />

                {/* Instructor */}
                <div className={styles.instructorCard}>
                  <div className={styles.instructorHeader}>
                    <div className={styles.instructorAvatarLarge}>
                      <Image src={courseData.instructor.avatar} alt={courseData.instructor.name} fill />
                    </div>
                    <div className={styles.instructorDetails}>
                      <h3>{courseData.instructor.name}</h3>
                      <p>{courseData.instructor.title}</p>
                      <div className={styles.instructorStats}>
                        <span><Star size={14} /> {courseData.instructor.rating} Rating</span>
                        <span><Users size={14} /> {(courseData.instructor.studentsCount / 1000).toFixed(0)}k Students</span>
                        <span><BookOpen size={14} /> {courseData.instructor.coursesCount} Courses</span>
                      </div>
                    </div>
                  </div>
                  <p className={styles.instructorBio}>{courseData.instructor.bio}</p>
                </div>
              </section>

              {/* Outcomes Section */}
              <section ref={outcomesRef} className={styles.section}>
                <h2>What You'll Learn</h2>
                <div className={styles.outcomesGrid}>
                  {courseData.outcomes.map((outcome, index) => (
                    <div key={index} className={styles.outcomeItem}>
                      <CheckCircle size={20} />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>

                <h3 className={styles.subheading}>Requirements</h3>
                <ul className={styles.requirementsList}>
                  {courseData.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </section>

              {/* Modules Section */}
              <section ref={modulesRef} className={styles.section}>
                <h2>Course Content</h2>
                <p className={styles.modulesSummary}>
                  {courseData.modules.length} modules • {totalLessons} lessons • {courseData.duration} total
                </p>

                <div className={styles.modulesList}>
                  {courseData.modules.map((module) => (
                    <div 
                      key={module.uid} 
                      className={`${styles.moduleItem} ${expandedModules.includes(module.uid) ? styles.expanded : ''}`}
                    >
                      <button
                        className={styles.moduleHeader}
                        onClick={() => toggleModule(module.uid)}
                      >
                        <ChevronDown size={20} className={styles.moduleChevron} />
                        <div className={styles.moduleInfo}>
                          <h4>{module.title}</h4>
                          <span>{module.lessons.length} lessons • {module.duration}</span>
                        </div>
                      </button>

                      <div className={styles.lessonsList}>
                        {module.lessons.map((lesson) => (
                          <Link
                            key={lesson.uid}
                            href={lesson.isPreview ? `/module/${lesson.uid}` : '#'}
                            className={`${styles.lessonItem} ${!lesson.isPreview ? styles.locked : ''}`}
                          >
                            {lesson.isPreview ? (
                              <Play size={16} />
                            ) : (
                              <Lock size={16} />
                            )}
                            <span className={styles.lessonTitle}>{lesson.title}</span>
                            <span className={styles.lessonDuration}>{lesson.duration}</span>
                            {lesson.isPreview && (
                              <span className={styles.previewBadge}>Preview</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Reviews Section */}
              <section ref={reviewsRef} className={styles.section}>
                <h2>Student Reviews</h2>
                
                <div className={styles.reviewsSummary}>
                  <div className={styles.ratingLarge}>
                    <span className={styles.ratingNumber}>{courseData.rating}</span>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={20} 
                          fill={i < Math.round(courseData.rating) ? 'var(--warning-500)' : 'var(--neutral-300)'} 
                          stroke={i < Math.round(courseData.rating) ? 'var(--warning-500)' : 'var(--neutral-300)'}
                        />
                      ))}
                    </div>
                    <span className={styles.totalReviews}>
                      {courseData.reviewsCount.toLocaleString()} reviews
                    </span>
                  </div>
                </div>

                <div className={styles.reviewsList}>
                  {courseData.reviews.map((review) => (
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

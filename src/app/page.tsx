'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Rocket, 
  Users, 
  Award, 
  BookOpen, 
  Play, 
  Star,
  ArrowRight,
  Zap,
  Globe,
  Clock,
  Shield,
  TrendingUp,
  Target,
  LucideIcon
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import FAQ from '@/components/FAQ';
import { useHeader } from '@/hooks/useHeader';
import { usePage } from '@/hooks/usePage';
import { useCourses, transformCourseToCard } from '@/hooks/useCourses';
import {
  PageEntry,
  IconEntry,
  TestimonialEntry,
  HeroBlockEntry,
  Link as CMSLink,
  isHeroSectionBlock,
  isFeatureBlock,
  isWorkflowBlock,
  isPartnersBlock,
  isTestimonialBlock,
  isCardBlock,
  isCTABlock,
  normalizeArray,
  extractRating,
  extractAuthorRole,
  extractHeroStats,
  extractFloatingCards,
} from '@/types/contentstack';
import styles from './page.module.css';

// Icon mapping for features/workflow
const iconMap: Record<string, LucideIcon> = {
  'zap': Zap,
  'users': Users,
  'award': Award,
  'globe': Globe,
  'clock': Clock,
  'shield': Shield,
  'book-open': BookOpen,
  'trending-up': TrendingUp,
  'target': Target,
  'rocket': Rocket,
  'star': Star,
};

// Fallback data (used when CMS data is not available)
const fallbackStats = [
  { value: '1000+', label: 'Courses', icon: BookOpen },
  { value: '50K+', label: 'Students', icon: Users },
  { value: '200+', label: 'Instructors', icon: Award },
  { value: '4.9', label: 'Avg Rating', icon: Star },
];

const fallbackFeatures = [
  { icon: Zap, title: 'Learn Anytime', description: 'Access courses 24/7 from any device. Learn at your own pace with lifetime access to all content.' },
  { icon: Users, title: 'Expert Instructors', description: 'Learn from industry professionals with real-world experience in top tech companies.' },
  { icon: Award, title: 'Earn Certificates', description: 'Get recognized certificates upon completion to showcase your skills to employers.' },
  { icon: Globe, title: 'Global Community', description: 'Join a worldwide community of learners. Collaborate, share, and grow together.' },
  { icon: Clock, title: 'Self-Paced Learning', description: 'No deadlines, no pressure. Complete courses on your schedule at your own speed.' },
  { icon: Shield, title: 'Quality Content', description: 'Curated, up-to-date curriculum reviewed by industry experts regularly.' },
];

const fallbackWorkflow = [
  { number: '01', title: 'Create Your Account', description: 'Sign up and set up your learning profile in minutes.' },
  { number: '02', title: 'Choose Your Course', description: 'Browse our catalog and enroll in any course you like.' },
  { number: '03', title: 'Learn & Earn Certificate', description: 'Complete lessons, finish projects, and earn your certificate.' },
];

const fallbackPartners = ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix'];

const fallbackTestimonials = [
  { name: 'Alex Thompson', role: 'Software Developer', company: 'Google', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', quote: 'StackAcademy transformed my career. The courses are comprehensive and the instructors are amazing. I landed my dream job within 3 months!', rating: 5 },
  { name: 'Priya Sharma', role: 'Data Scientist', company: 'Microsoft', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', quote: 'The Machine Learning course was exceptional with clear explanations and hands-on projects. Highly recommended for anyone starting in ML.', rating: 5 },
  { name: 'James Chen', role: 'Product Manager', company: 'Amazon', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', quote: 'Best learning platform I\'ve ever used. The project-based approach helped me build a strong portfolio that impressed recruiters.', rating: 5 },
];

const popularCourses = [
  { uid: 'blte66355d66dec039d', title: 'Complete React Developer Course', slug: 'react-developer-course', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600', instructorName: 'Sarah Johnson', level: 'beginner' as const, duration: '35 hours', rating: 4.9, reviewsCount: 12500, studentsEnrolled: 45000, isPopular: true },
  { uid: 'blt6139b873994abedc', title: 'Machine Learning with Python', slug: 'machine-learning-python', thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600', instructorName: 'Michael Chen', level: 'intermediate' as const, duration: '38 hours', rating: 4.8, reviewsCount: 8900, studentsEnrolled: 28000, isFeatured: true },
  { uid: 'blte671205ef0de57c1', title: 'AWS Cloud Practitioner', slug: 'aws-cloud-practitioner', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600', instructorName: 'David Park', level: 'intermediate' as const, duration: '45 hours', rating: 4.9, reviewsCount: 6700, studentsEnrolled: 19000 },
  { uid: 'bltd97014c9501ad853', title: 'UX/UI Design Fundamentals', slug: 'ux-ui-design-fundamentals', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600', instructorName: 'Emma Wilson', level: 'beginner' as const, duration: '35 hours', rating: 4.7, reviewsCount: 5200, studentsEnrolled: 15000 },
];

const fallbackFaqs = [
  { uid: '1', question: 'How do I get started?', answer: 'Simply create an account, browse our course catalog, and enroll in any course that interests you. You can start learning immediately!' },
  { uid: '2', question: 'Do I get a certificate after completing a course?', answer: 'Yes! Upon successful completion of any course, you will receive a verified certificate that you can share on LinkedIn, include in your resume, or show to potential employers.' },
  { uid: '3', question: 'Can I access courses on mobile devices?', answer: 'Absolutely! Our platform is fully responsive and works on all devices. You can learn on your smartphone, tablet, or computer.' },
  { uid: '4', question: 'How long do I have access to the courses?', answer: 'Once you enroll in a course, you have lifetime access. Learn at your own pace and revisit the content whenever you need a refresher.' },
  { uid: '5', question: 'Can I get help if I\'m stuck on a topic?', answer: 'Yes! Each course has a Q&A section where you can ask questions. You can also join our community forums to connect with other learners and instructors.' },
];

// Card block data with CTA
interface CardBlockData {
  title: string;
  description: string;
  ctaButton?: CMSLink;
}

// Helper to extract data from page sections
function extractSectionData(pageData: PageEntry | null) {
  if (!pageData?.section) return null;

  let heroBlock: HeroBlockEntry | null = null;
  let features: IconEntry[] = [];
  let workflow: IconEntry[] = [];
  let partners: { label?: string; names: string[] } = { names: [] };
  let testimonials: TestimonialEntry[] = [];
  let featuresTitle = { title: '', description: '' };
  let workflowTitle = { title: '', description: '' };
  let testimonialsTitle = { title: '', description: '' };
  let popularCoursesBlock: CardBlockData | null = null;
  let ctaSectionBlock: CardBlockData | null = null;

  for (const section of pageData.section) {
    if (isHeroSectionBlock(section)) {
      const heroBanners = normalizeArray(section.hero_block.hero_banner);
      heroBlock = heroBanners[0] || null;
    }
    if (isFeatureBlock(section)) {
      features = normalizeArray(section.feature_block.features);
      featuresTitle = {
        title: section.feature_block.title_and_description?.title || '',
        description: section.feature_block.title_and_description?.description || '',
      };
    }
    if (isWorkflowBlock(section)) {
      workflow = normalizeArray(section.workflow_block.stage);
      workflowTitle = {
        title: section.workflow_block.title_and_description?.title || '',
        description: section.workflow_block.title_and_description?.description || '',
      };
    }
    if (isPartnersBlock(section)) {
      partners = {
        label: section.partners_block.label,
        names: section.partners_block.partner || [],
      };
    }
    if (isTestimonialBlock(section)) {
      testimonials = normalizeArray(section.testimonial_block.testimonial);
      testimonialsTitle = {
        title: section.testimonial_block.title_and_description?.title || '',
        description: section.testimonial_block.title_and_description?.description || '',
      };
    }
    if (isCardBlock(section)) {
      const title = section.card_block.title_and_description?.title || '';
      const description = section.card_block.title_and_description?.description || '';
      const ctaButton = section.card_block.cta_button;
      
      // For landing page, we only have one card block (Popular Courses)
      popularCoursesBlock = { title, description, ctaButton };
    }
    if (isCTABlock(section)) {
      ctaSectionBlock = {
        title: section.cta_block.cta_title?.title || '',
        description: section.cta_block.cta_title?.description || '',
        ctaButton: section.cta_block.cta_button,
      };
    }
  }

  return { heroBlock, features, workflow, partners, testimonials, featuresTitle, workflowTitle, testimonialsTitle, popularCoursesBlock, ctaSectionBlock };
}

export default function LandingPage() {
  // Fetch header data from Contentstack
  const { headerData } = useHeader('Landing Header');
  
  // Fetch page data from Contentstack
  const { pageData, isLoading } = usePage('Landing Page');
  
  // Fetch courses from CMS
  const { courses: cmsCourses } = useCourses();
  
  // Transform CMS courses to card format
  const cmsCoursesForCards = cmsCourses.slice(0, 4).map(transformCourseToCard);

  // Extract section data from CMS
  const sectionData = extractSectionData(pageData);

  // Determine what data to use (CMS or fallback)
  const hasCMSHero = sectionData?.heroBlock != null;
  const hasCMSFeatures = sectionData && sectionData.features.length > 0;
  const hasCMSWorkflow = sectionData && sectionData.workflow.length > 0;
  const hasCMSPartners = sectionData && sectionData.partners.names.length > 0;
  const hasCMSTestimonials = sectionData && sectionData.testimonials.length > 0;

  // Hero data (CMS or fallback)
  const hero = sectionData?.heroBlock;
  
  // Extract stats and floating cards using helper functions
  const heroStats = hero ? extractHeroStats(hero.stats) : [];
  const floatingCards = hero ? extractFloatingCards(hero.floating_cards) : [];

  return (
    <>
      <Header variant="landing" headerData={headerData} />
      
      <main className={styles.main}>
        {/* Hero Section */}
        <section id="hero" className={styles.hero}>
          <div className={styles.heroBackground}>
            <div className={styles.gradientOrb1} />
            <div className={styles.gradientOrb2} />
            <div className={styles.gridPattern} />
          </div>
          
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <div className={styles.badge}>
                {hasCMSHero && hero?.badge_icon ? (
                  (() => {
                    const BadgeIcon = iconMap[hero.badge_icon] || Rocket;
                    return <BadgeIcon size={16} />;
                  })()
                ) : (
                  <Rocket size={16} />
                )}
                <span>{hasCMSHero ? hero?.badge_text : 'Start Learning Today'}</span>
              </div>
              
              <h1 className={styles.heroTitle}>
                {hasCMSHero && hero?.headline ? (
                  // If we have a highlight text, split and highlight it
                  hero.highlight_text ? (
                    <>
                      {hero.headline.split(hero.highlight_text).map((part, i, arr) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className={styles.highlight}>{hero.highlight_text}</span>
                          )}
                        </span>
                      ))}
                    </>
                  ) : (
                    // No highlight text, just render the headline
                    <>{hero.headline}</>
                  )
                ) : (
                  // Fallback when no CMS data
                  <>
                    Learn a <span className={styles.highlight}>New Skill</span><br />
                    Everyday, Anytime,<br />
                    and Anywhere.
                  </>
                )}
              </h1>
              
              <p className={styles.heroSubtitle}>
                {hasCMSHero && hero?.subtitle ? hero.subtitle : (
                  <>
                    <strong>1000+</strong> courses covering all tech domains for you to learn 
                    and explore new opportunities. Learn from Industry Experts and land your Dream Job.
                  </>
                )}
              </p>
              
              <div className={styles.heroCta}>
                <Link 
                  href={hasCMSHero && hero?.primary_cta?.href ? hero.primary_cta.href : '/signup'} 
                  className={styles.primaryBtn}
                >
                  {hasCMSHero && hero?.primary_cta?.title ? hero.primary_cta.title : 'Get Started'}
                  <ArrowRight size={20} />
                </Link>
                <button className={styles.secondaryBtn}>
                  <Play size={20} fill="var(--primary-500)" />
                  <span>{hasCMSHero && hero?.secondary_cta?.title ? hero.secondary_cta.title : 'How it Works'}</span>
                </button>
              </div>

              {/* Stats */}
              <div className={styles.stats}>
                {hasCMSHero && heroStats.length > 0 ? (
                  heroStats.map((stat, index) => (
                    <div key={`stat-${index}`} className={styles.statItem}>
                      <div className={styles.statValue}>{stat.value}</div>
                      <div className={styles.statLabel}>{stat.label}</div>
                    </div>
                  ))
                ) : (
                  fallbackStats.map((stat, index) => (
                    <div key={`stat-${index}`} className={styles.statItem}>
                      <div className={styles.statValue}>{stat.value}</div>
                      <div className={styles.statLabel}>{stat.label}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.heroImage}>
              <div className={styles.heroImageWrapper}>
                {hasCMSHero && hero?.hero_image?.url ? (
                  <Image
                    src={hero.hero_image.url}
                    alt={hero.headline || 'Students learning'}
                    fill
                    className={styles.heroImg}
                    priority
                  />
                ) : (
                  <Image
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"
                    alt="Students learning"
                    fill
                    className={styles.heroImg}
                    priority
                  />
                )}
                
                {/* Floating Cards - Using extracted data */}
                {hasCMSHero && floatingCards.length >= 1 ? (
                  <>
                    <div className={styles.floatingCard1}>
                      <div className={styles.floatingIcon}>
                        {(() => {
                          const CardIcon = iconMap[floatingCards[0].icon] || TrendingUp;
                          return <CardIcon size={24} />;
                        })()}
                      </div>
                      <div>
                        <strong>{floatingCards[0].value}</strong>
                        <span>{floatingCards[0].label}</span>
                      </div>
                    </div>
                    {floatingCards.length >= 2 && (
                      <div className={styles.floatingCard2}>
                        <div className={styles.floatingIcon}>
                          {(() => {
                            const CardIcon = iconMap[floatingCards[1].icon] || Target;
                            return <CardIcon size={24} />;
                          })()}
                        </div>
                        <div>
                          <strong>{floatingCards[1].value}</strong>
                          <span>{floatingCards[1].label}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.floatingCard1}>
                      <div className={styles.floatingIcon}>
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <strong>95%</strong>
                        <span>Success Rate</span>
                      </div>
                    </div>
                    <div className={styles.floatingCard2}>
                      <div className={styles.floatingIcon}>
                        <Target size={24} />
                      </div>
                      <div>
                        <strong>50K+</strong>
                        <span>Goals Achieved</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section className={styles.partners}>
          <div className="container">
            <p className={styles.partnersLabel}>
              {hasCMSPartners ? sectionData.partners.label : 'Trusted by learners from top companies'}
            </p>
            <div className={styles.partnerLogos}>
              {(hasCMSPartners ? sectionData.partners.names : fallbackPartners).map((partner, index) => (
                <div key={`partner-${index}`} className={styles.partnerLogo}>
                  <span>{partner}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={`${styles.features} section`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className="section-title">
                {hasCMSFeatures && sectionData.featuresTitle.title 
                  ? sectionData.featuresTitle.title 
                  : 'Why Choose StackAcademy?'}
              </h2>
              <p className="section-subtitle">
                {hasCMSFeatures && sectionData.featuresTitle.description
                  ? sectionData.featuresTitle.description
                  : 'We provide the best learning experience with cutting-edge features designed for your success.'}
              </p>
            </div>

            <div className={styles.featuresGrid}>
              {hasCMSFeatures ? (
                // Render CMS features
                sectionData.features.map((feature, index) => {
                  const FeatureIcon = iconMap[feature.icon_name || 'zap'] || Zap;
                  return (
                    <div 
                      key={feature.uid} 
                      className={styles.featureCard}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={styles.featureIcon}>
                        <FeatureIcon size={28} />
                      </div>
                      <h3>{feature.icon_title || feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  );
                })
              ) : (
                // Render fallback features
                fallbackFeatures.map((feature, index) => (
                  <div 
                    key={`feature-${index}`} 
                    className={styles.featureCard}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={styles.featureIcon}>
                      <feature.icon size={28} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Popular Courses Section */}
        <section id="courses" className={`${styles.courses} section`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="section-title">
                  {sectionData?.popularCoursesBlock?.title || 'Popular Courses'}
                </h2>
                <p className="section-subtitle">
                  {sectionData?.popularCoursesBlock?.description || 'Explore our most popular courses and start learning today!'}
                </p>
              </div>
              <Link 
                href={sectionData?.popularCoursesBlock?.ctaButton?.href || '/courses'} 
                className={styles.viewAllBtn}
              >
                {sectionData?.popularCoursesBlock?.ctaButton?.title || 'View All Courses'}
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className={styles.coursesGrid}>
              {(cmsCoursesForCards.length > 0 ? cmsCoursesForCards : popularCourses).map((course) => (
                <CourseCard key={course.uid} {...course} redirectTo="/signup" />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className={`${styles.howItWorks} section`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className="section-title">
                {hasCMSWorkflow && sectionData.workflowTitle.title
                  ? sectionData.workflowTitle.title
                  : 'How It Works'}
              </h2>
              <p className="section-subtitle">
                {hasCMSWorkflow && sectionData.workflowTitle.description
                  ? sectionData.workflowTitle.description
                  : 'Start your learning journey in just 3 simple steps.'}
              </p>
            </div>

            <div className={styles.stepsGrid}>
              {hasCMSWorkflow ? (
                // Render CMS workflow steps
                sectionData.workflow.map((step, index) => (
                  <div key={step.uid} className={styles.stepWrapper}>
                    <div className={styles.step}>
                      <div className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</div>
                      <div className={styles.stepContent}>
                        <h3>{step.icon_title || step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </div>
                    {index < sectionData.workflow.length - 1 && (
                      <div className={styles.stepConnector} />
                    )}
                  </div>
                ))
              ) : (
                // Render fallback workflow
                fallbackWorkflow.map((step, index) => (
                  <div key={`workflow-${index}`} className={styles.stepWrapper}>
                    <div className={styles.step}>
                      <div className={styles.stepNumber}>{step.number}</div>
                      <div className={styles.stepContent}>
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </div>
                    {index < fallbackWorkflow.length - 1 && (
                      <div className={styles.stepConnector} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className={`${styles.testimonials} section`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className="section-title">
                {hasCMSTestimonials && sectionData.testimonialsTitle.title
                  ? sectionData.testimonialsTitle.title
                  : 'What Our Students Say'}
              </h2>
              <p className="section-subtitle">
                {hasCMSTestimonials && sectionData.testimonialsTitle.description
                  ? sectionData.testimonialsTitle.description
                  : 'Join thousands of satisfied learners who have transformed their careers.'}
              </p>
            </div>

            <div className={styles.testimonialsGrid}>
              {hasCMSTestimonials ? (
                // Render CMS testimonials
                sectionData.testimonials.map((testimonial) => {
                  const author = normalizeArray(testimonial.author)[0];
                  const rating = extractRating(testimonial.rating);
                  const authorInfo = extractAuthorRole(author?.bio);
                  
                  return (
                    <div key={testimonial.uid} className={styles.testimonialCard}>
                      <div className={styles.testimonialRating}>
                        {[...Array(Math.round(rating))].map((_, i) => (
                          <Star key={`star-${testimonial.uid}-${i}`} size={18} fill="var(--warning-500)" stroke="var(--warning-500)" />
                        ))}
                      </div>
                      <p className={styles.testimonialQuote}>"{testimonial.review}"</p>
                      <div className={styles.testimonialAuthor}>
                        <div className={styles.authorAvatar}>
                          {author?.picture?.url ? (
                            <Image 
                              src={author.picture.url} 
                              alt={author?.title || testimonial.title} 
                              fill 
                            />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {(author?.title || testimonial.title).charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className={styles.authorInfo}>
                          <h4>{author?.title || testimonial.title}</h4>
                          <p>
                            {authorInfo.role}
                            {authorInfo.company && ` at ${authorInfo.company}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Render fallback testimonials
                fallbackTestimonials.map((testimonial, index) => (
                  <div key={`testimonial-${index}`} className={styles.testimonialCard}>
                    <div className={styles.testimonialRating}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={`star-fallback-${index}-${i}`} size={18} fill="var(--warning-500)" stroke="var(--warning-500)" />
                      ))}
                    </div>
                    <p className={styles.testimonialQuote}>"{testimonial.quote}"</p>
                    <div className={styles.testimonialAuthor}>
                      <div className={styles.authorAvatar}>
                        <Image 
                          src={testimonial.avatar} 
                          alt={testimonial.name} 
                          fill 
                        />
                      </div>
                      <div className={styles.authorInfo}>
                        <h4>{testimonial.name}</h4>
                        <p>{testimonial.role} at {testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className="container">
            <div className={styles.ctaContent}>
              <h2>
                {sectionData?.ctaSectionBlock?.title || 'Ready to Start Learning?'}
              </h2>
              <p>
                {sectionData?.ctaSectionBlock?.description || 
                  'Join over 50,000+ students who are already learning and growing with StackAcademy.'}
              </p>
              <div className={styles.ctaButtons}>
                <Link 
                  href={sectionData?.ctaSectionBlock?.ctaButton?.href || '/signup'} 
                  className={styles.ctaPrimaryBtn}
                >
                  {sectionData?.ctaSectionBlock?.ctaButton?.title || 'Get Started'}
                  <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="section">
          <div className="container">
            <FAQ 
              items={fallbackFaqs}
              title="Frequently Asked Questions"
              subtitle="Have questions? We've got answers."
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

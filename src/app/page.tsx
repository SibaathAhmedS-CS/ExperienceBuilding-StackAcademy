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
import {
  PageEntry,
  IconEntry,
  TestimonialEntry,
  HeroBlockEntry,
  isHeroSectionBlock,
  isFeatureBlock,
  isWorkflowBlock,
  isPartnersBlock,
  isTestimonialBlock,
  normalizeArray,
  extractRating,
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
  { uid: '1', title: 'Complete Web Development Bootcamp', slug: 'complete-web-development', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600', instructorName: 'Sarah Johnson', level: 'beginner' as const, duration: '52 hours', rating: 4.9, reviewsCount: 12500, studentsEnrolled: 45000, isPopular: true },
  { uid: '2', title: 'Machine Learning with Python', slug: 'machine-learning-python', thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600', instructorName: 'Michael Chen', level: 'intermediate' as const, duration: '38 hours', rating: 4.8, reviewsCount: 8900, studentsEnrolled: 28000, isFeatured: true },
  { uid: '3', title: 'AWS Certified Solutions Architect', slug: 'aws-solutions-architect', thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600', instructorName: 'David Park', level: 'advanced' as const, duration: '45 hours', rating: 4.9, reviewsCount: 6700, studentsEnrolled: 19000 },
  { uid: '4', title: 'UI/UX Design Masterclass', slug: 'uiux-design-masterclass', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600', instructorName: 'Emma Wilson', level: 'beginner' as const, duration: '28 hours', rating: 4.7, reviewsCount: 5200, studentsEnrolled: 15000 },
];

const fallbackFaqs = [
  { uid: '1', question: 'How do I get started?', answer: 'Simply create an account, browse our course catalog, and enroll in any course that interests you. You can start learning immediately!' },
  { uid: '2', question: 'Do I get a certificate after completing a course?', answer: 'Yes! Upon successful completion of any course, you will receive a verified certificate that you can share on LinkedIn, include in your resume, or show to potential employers.' },
  { uid: '3', question: 'Can I access courses on mobile devices?', answer: 'Absolutely! Our platform is fully responsive and works on all devices. You can learn on your smartphone, tablet, or computer.' },
  { uid: '4', question: 'How long do I have access to the courses?', answer: 'Once you enroll in a course, you have lifetime access. Learn at your own pace and revisit the content whenever you need a refresher.' },
  { uid: '5', question: 'Can I get help if I\'m stuck on a topic?', answer: 'Yes! Each course has a Q&A section where you can ask questions. You can also join our community forums to connect with other learners and instructors.' },
];

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
  }

  return { heroBlock, features, workflow, partners, testimonials, featuresTitle, workflowTitle, testimonialsTitle };
}

export default function LandingPage() {
  // Fetch header data from Contentstack
  const { headerData } = useHeader('Landing Header');
  
  // Fetch page data from Contentstack
  const { pageData, isLoading } = usePage('Landing Page');

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
                {hasCMSHero ? (
                  <>
                    {hero?.headline?.split(hero?.highlight_text || '').map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && hero?.highlight_text && (
                          <span className={styles.highlight}>{hero.highlight_text}</span>
                        )}
                      </span>
                    ))}
                  </>
                ) : (
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
                {hasCMSHero && hero?.stats && hero.stats.length > 0 ? (
                  hero.stats.map((stat, index) => {
                    const StatIcon = iconMap[stat.icon || 'star'] || Star;
                    return (
                      <div key={`stat-${index}`} className={styles.statItem}>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statLabel}>{stat.label}</div>
                      </div>
                    );
                  })
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
                {hasCMSHero && hero?.image?.url ? (
                  <Image
                    src={hero.image.url}
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
                
                {/* Floating Cards */}
                {hasCMSHero && hero?.floating_cards && hero.floating_cards.length >= 1 ? (
                  <>
                    <div className={styles.floatingCard1}>
                      <div className={styles.floatingIcon}>
                        {(() => {
                          const CardIcon = iconMap[hero.floating_cards[0].icon] || TrendingUp;
                          return <CardIcon size={24} />;
                        })()}
                      </div>
                      <div>
                        <strong>{hero.floating_cards[0].value}</strong>
                        <span>{hero.floating_cards[0].label}</span>
                      </div>
                    </div>
                    {hero.floating_cards.length >= 2 && (
                      <div className={styles.floatingCard2}>
                        <div className={styles.floatingIcon}>
                          {(() => {
                            const CardIcon = iconMap[hero.floating_cards[1].icon] || Target;
                            return <CardIcon size={24} />;
                          })()}
                        </div>
                        <div>
                          <strong>{hero.floating_cards[1].value}</strong>
                          <span>{hero.floating_cards[1].label}</span>
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
                <h2 className="section-title">Popular Courses</h2>
                <p className="section-subtitle">
                  Explore our most popular courses and start learning today!
                </p>
              </div>
              <Link href="/courses" className={styles.viewAllBtn}>
                View All Courses
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className={styles.coursesGrid}>
              {popularCourses.map((course) => (
                <CourseCard key={course.uid} {...course} />
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
                  
                  return (
                    <div key={testimonial.uid} className={styles.testimonialCard}>
                      <div className={styles.testimonialRating}>
                        {[...Array(rating)].map((_, i) => (
                          <Star key={`star-${testimonial.uid}-${i}`} size={18} fill="var(--warning-500)" stroke="var(--warning-500)" />
                        ))}
                      </div>
                      <p className={styles.testimonialQuote}>"{testimonial.review}"</p>
                      <div className={styles.testimonialAuthor}>
                        <div className={styles.authorAvatar}>
                          {author?.avatar?.url ? (
                            <Image 
                              src={author.avatar.url} 
                              alt={author?.name || testimonial.title} 
                              fill 
                            />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {(author?.name || testimonial.title).charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className={styles.authorInfo}>
                          <h4>{author?.name || testimonial.title}</h4>
                          <p>
                            {author?.designation || 'Student'}
                            {author?.company && ` at ${author.company}`}
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
              <h2>Ready to Start Learning?</h2>
              <p>Join over 50,000+ students who are already learning and growing with StackAcademy.</p>
              <div className={styles.ctaButtons}>
                <Link href="/signup" className={styles.ctaPrimaryBtn}>
                  Get Started
                  <ArrowRight size={20} />
                </Link>
                <Link href="/courses" className={styles.ctaSecondaryBtn}>
                  Browse Courses
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

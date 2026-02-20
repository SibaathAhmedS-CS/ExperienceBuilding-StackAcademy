'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BookOpen, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  X,
  Check,
  LucideIcon,
  GraduationCap,
  Library,
  School
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './Footer.module.css';
import { useFooter, useNewsletter } from '@/hooks/useFooter';
import { FooterEntry, NewsletterEntry, IconEntry } from '@/types/contentstack';
import Toast from '@/components/Toast';
import { getLivePreviewAttributes } from '@/utils/livePreview';

// Icon mapping for logo
const logoIconMap: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'library': Library,
  'school': School,
  'mail': Mail,
};

// Social icon mapping - maps platform names to Lucide icons
const socialIconMap: Record<string, LucideIcon> = {
  'facebook': Facebook,
  'twitter': Twitter,
  'x': X,
  'instagram': Instagram,
  'linkedin': Linkedin,
  'youtube': Youtube,
};

// Helper to get icon data from reference
function getIconData(icon: IconEntry | null | undefined): { iconName: string; iconText: string } {
  if (!icon) {
    return { iconName: 'book-open', iconText: 'StackAcademy' };
  }
  const iconName = icon.icon_name || 'book-open';
  const iconText = icon.icon_title || 'StackAcademy';
  return { iconName, iconText };
}

// Fallback data
const fallbackFooter = {
  brandDescription: 'Empowering learners worldwide with high-quality courses taught by industry experts. Start your learning journey today!',
  contactInfo: {
    email: 'hello@stackacademy.com',
    phone: '+1 (555) 123-4567',
    address: 'San Francisco, CA',
  },
  socialLinks: [
    { title: 'Facebook', href: 'https://facebook.com' },
    { title: 'Twitter', href: 'https://twitter.com' },
    { title: 'Instagram', href: 'https://instagram.com' },
    { title: 'LinkedIn', href: 'https://linkedin.com' },
    { title: 'YouTube', href: 'https://youtube.com' },
  ],
  copyrightText: '© {year} StackAcademy. All rights reserved.',
};

const fallbackNewsletter = {
  heading: 'Stay Updated with Latest Courses',
  description: 'Subscribe to our newsletter and never miss new courses and learning opportunities.',
  placeholderText: 'Enter your email address',
  buttonText: 'Subscribed',  // Text when subscribed
  notSubscribedText: 'Subscribe',  // Text when not subscribed
};

interface FooterProps {
  footerData?: FooterEntry | null;
  newsletterData?: NewsletterEntry | null;
}

export default function Footer({ footerData: propFooterData, newsletterData: propNewsletterData }: FooterProps = {}) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  
  // Check if we're on home page (not landing page)
  const isHomePage = pathname === '/home';
  
  // Check if user is already subscribed (on all pages)
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('newsletter_subscribed')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.newsletter_subscribed) {
            setIsSubscribed(true);
          }
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };
    
    // Check subscription status on all pages
    checkSubscriptionStatus();
  }, [supabase]);

  // Fetch data from Contentstack if not provided via props
  const { footerData: fetchedFooterData } = useFooter();
  const { newsletterData: fetchedNewsletterData } = useNewsletter();

  // Use props if provided, otherwise use fetched data
  const footerData = propFooterData ?? fetchedFooterData;
  const newsletterData = propNewsletterData ?? fetchedNewsletterData;

  // Extract logo data from CMS or fallback
  const { iconName: logoIconName, iconText: logoText } = getIconData(footerData?.icon);
  const LogoIcon = logoIconMap[logoIconName] || BookOpen;

  // Get newsletter icon
  const { iconName: newsletterIconName } = getIconData(newsletterData?.icon);
  const NewsletterIcon = logoIconMap[newsletterIconName] || Mail;

  // Get content from CMS or fallback
  const brandDescription = footerData?.brand_desciption || fallbackFooter.brandDescription;
  const contactEmail = footerData?.contact_info?.email || fallbackFooter.contactInfo.email;
  const contactPhone = footerData?.contact_info?.phone_no || fallbackFooter.contactInfo.phone;
  const contactAddress = footerData?.contact_info?.address || fallbackFooter.contactInfo.address;
  
  // Get social links from CMS or fallback
  const socialLinks = footerData?.social_links && footerData.social_links.length > 0
    ? footerData.social_links
    : fallbackFooter.socialLinks;

  // Get copyright text
  const copyrightText = footerData?.copyright_text || fallbackFooter.copyrightText;
  const formattedCopyright = copyrightText.replace('{year}', new Date().getFullYear().toString());

  // Get newsletter content
  const newsletterHeading = newsletterData?.heading || fallbackNewsletter.heading;
  const newsletterDescription = newsletterData?.description || fallbackNewsletter.description;
  const newsletterPlaceholder = newsletterData?.placeholder_text || fallbackNewsletter.placeholderText;
  const newsletterSubscribedText = newsletterData?.button_text || fallbackNewsletter.buttonText;
  const newsletterNotSubscribedText = newsletterData?.not_subscribed_text || fallbackNewsletter.notSubscribedText;

  // Helper to get social icon from platform name (derived from link title)
  const getSocialIcon = (title: string): LucideIcon => {
    const platformName = title.toLowerCase().replace(/\s+/g, '');
    return socialIconMap[platformName] || Mail;
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // For landing page, validate email
    if (!isHomePage && (!email || !email.includes('@'))) {
      try
      {
        setIsSubmitting(true);
        const { data, error } = await supabase
        .from('subscribedprofiles')
        .upsert(
          { 
            email: email
          }, 
          { onConflict: 'email' }
        )
        .select();
      }
      catch (error) {
        console.error('Error subscribing to newsletter:', error);
      }
      finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        // User not logged in - could show a message or redirect to login
        console.error('User not authenticated');
        setIsSubmitting(false);
        return;
      }

      // Update user profile to set newsletter_subscribed = true
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ newsletter_subscribed: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating newsletter subscription:', updateError);
        setIsSubmitting(false);
        return;
      }

      // Update subscription state
      setIsSubscribed(true);
      
      // Show success toast
      setShowToast(true);
      
      // Clear email input only on landing page
      if (!isHomePage) {
        setEmail('');
      }
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);

    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle subscribe button click (for home page - no form submission)
  const handleSubscribeClick = async () => {
    if (isSubscribed) return; // Already subscribed
    
    setIsSubmitting(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('User not authenticated');
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ newsletter_subscribed: true })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating newsletter subscription:', updateError);
        setIsSubmitting(false);
        return;
      }

      setIsSubscribed(true);
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
      }, 3000);

    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toast
        message="Successfully subscribed to newsletter!"
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
      <footer className={styles.footer} {...getLivePreviewAttributes(footerData?.$)}>
      {/* Newsletter Section */}
      <div className={styles.newsletter} {...getLivePreviewAttributes((newsletterData as any)?.$)}>
        <div className={styles.container}>
          <div className={styles.newsletterContent}>
            <div className={styles.newsletterText}>
              <h3 {...getLivePreviewAttributes((newsletterData as any)?.$?.heading)}>{newsletterHeading}</h3>
              <p {...getLivePreviewAttributes((newsletterData as any)?.$?.description)}>{newsletterDescription}</p>
            </div>
            {isHomePage ? (
              // Home page: Only subscribe button
              <button 
                className={`${styles.subscribeBtn} ${isSubscribed ? styles.subscribed : ''}`}
                onClick={handleSubscribeClick}
                disabled={isSubmitting || isSubscribed}
              >
                {isSubscribed ? (
                  <>
                    <Check size={18} />
                    {newsletterSubscribedText}
                  </>
                ) : (
                  <>
                    {isSubmitting ? 'Subscribing...' : newsletterNotSubscribedText}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            ) : (
              // Landing page: Email input + subscribe button
              <form className={styles.newsletterForm} onSubmit={handleNewsletterSubmit}>
                {!isSubscribed && (
                  <div className={styles.inputWrapper}>
                    <NewsletterIcon size={20} />
                    <input 
                      type="email" 
                      placeholder={newsletterPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                <button 
                  type={isSubscribed ? 'button' : 'submit'}
                  className={`${styles.subscribeBtn} ${isSubscribed ? styles.subscribed : ''}`}
                  disabled={isSubmitting || isSubscribed}
                >
                  {isSubscribed ? (
                    <>
                      <Check size={18} />
                      {newsletterSubscribedText}
                    </>
                  ) : (
                    <>
                      {isSubmitting ? 'Subscribing...' : newsletterNotSubscribedText}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer - Two column layout */}
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.simplifiedGrid}>
            {/* Left: Brand Column */}
            <div className={styles.brandColumn}>
              <Link href="/" className={styles.logo} {...getLivePreviewAttributes(footerData?.$?.icon)}>
                <div className={styles.logoIcon} {...getLivePreviewAttributes(footerData?.$?.icon)}>
                  <LogoIcon size={24} />
                </div>
                <span className={styles.logoText} {...getLivePreviewAttributes(footerData?.$?.icon)}>{logoText}</span>
              </Link>
              <p 
                className={styles.brandDescription}
                {...getLivePreviewAttributes(footerData?.$?.brand_desciption)}
              >
                {brandDescription}
              </p>
            </div>

            {/* Right: Contact Info */}
            <div className={styles.contactInfo} {...getLivePreviewAttributes(footerData?.$?.contact_info)}>
              <div className={styles.contactItem} {...getLivePreviewAttributes((footerData as any)?.$?.['contact_info.email'])}>
                <Mail size={16} />
                <span>{contactEmail}</span>
              </div>
              <div className={styles.contactItem} {...getLivePreviewAttributes((footerData as any)?.$?.['contact_info.phone_no'])}>
                <Phone size={16} />
                <span>{contactPhone}</span>
              </div>
              <div className={styles.contactItem} {...getLivePreviewAttributes((footerData as any)?.$?.['contact_info.address'])}>
                <MapPin size={16} />
                <span>{contactAddress}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottom}>
        <div className={styles.container}>
          <div className={styles.bottomContent}>
            <p 
              className={styles.copyright}
              {...getLivePreviewAttributes(footerData?.$?.copyright_text)}
            >
              {formattedCopyright}
            </p>
            <div className={styles.socialLinks} {...getLivePreviewAttributes(footerData?.$?.social_links)}>
              {socialLinks.map((social, index) => {
                const SocialIcon = getSocialIcon(social.title);
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label={social.title}
                    {...getLivePreviewAttributes((footerData as any)?.$?.[`social_links.${index}`])}
                  >
                    <SocialIcon size={20} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}

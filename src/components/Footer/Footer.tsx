'use client';

import Link from 'next/link';
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
  LucideIcon,
  GraduationCap,
  Library,
  School
} from 'lucide-react';
import styles from './Footer.module.css';
import { useFooter, useNewsletter } from '@/hooks/useFooter';
import { FooterEntry, NewsletterEntry, IconEntry } from '@/types/contentstack';

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
  buttonText: 'Subscribe',
};

interface FooterProps {
  footerData?: FooterEntry | null;
  newsletterData?: NewsletterEntry | null;
}

export default function Footer({ footerData: propFooterData, newsletterData: propNewsletterData }: FooterProps = {}) {
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
  const newsletterButtonText = newsletterData?.button_text || fallbackNewsletter.buttonText;

  // Helper to get social icon from platform name (derived from link title)
  const getSocialIcon = (title: string): LucideIcon => {
    const platformName = title.toLowerCase().replace(/\s+/g, '');
    return socialIconMap[platformName] || Mail;
  };

  return (
    <footer className={styles.footer}>
      {/* Newsletter Section */}
      <div className={styles.newsletter}>
        <div className={styles.container}>
          <div className={styles.newsletterContent}>
            <div className={styles.newsletterText}>
              <h3>{newsletterHeading}</h3>
              <p>{newsletterDescription}</p>
            </div>
            <form className={styles.newsletterForm}>
              <div className={styles.inputWrapper}>
                <NewsletterIcon size={20} />
                <input type="email" placeholder={newsletterPlaceholder} />
              </div>
              <button type="submit" className={styles.subscribeBtn}>
                {newsletterButtonText}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer - Two column layout */}
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.simplifiedGrid}>
            {/* Left: Brand Column */}
            <div className={styles.brandColumn}>
              <Link href="/" className={styles.logo}>
                <div className={styles.logoIcon}>
                  <LogoIcon size={24} />
                </div>
                <span className={styles.logoText}>{logoText}</span>
              </Link>
              <p className={styles.brandDescription}>{brandDescription}</p>
            </div>

            {/* Right: Contact Info */}
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Mail size={16} />
                <span>{contactEmail}</span>
              </div>
              <div className={styles.contactItem}>
                <Phone size={16} />
                <span>{contactPhone}</span>
              </div>
              <div className={styles.contactItem}>
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
            <p className={styles.copyright}>{formattedCopyright}</p>
            <div className={styles.socialLinks}>
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
  );
}

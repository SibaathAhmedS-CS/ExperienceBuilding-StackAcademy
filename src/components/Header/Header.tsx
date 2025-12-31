'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, 
  User, 
  Menu, 
  X, 
  BookOpen,
  ChevronDown,
  LogOut,
  Settings,
  Award,
  GraduationCap,
  Library,
  School,
  Globe,
  LucideIcon
} from 'lucide-react';
import styles from './Header.module.css';
import { 
  HeaderEntry, 
  IconEntry,
  isAuthButtonsBlock, 
  isProfileBlock,
  ProfileDropdownItem 
} from '@/types/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';

// Icon mapping - maps CMS icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'library': Library,
  'school': School,
  'user': User,
  'settings': Settings,
  'log-out': LogOut,
  'award': Award,
};

// Helper to extract icon data from reference (handles both single and array)
function getIconData(icon: IconEntry | null | undefined): { iconName: string; iconText: string } {
  if (!icon) {
    return { iconName: 'book-open', iconText: 'StackAcademy' };
  }

  // Try different field names that might be used in the icon content type
  const iconName = icon.icon_name || 'book-open';
  const iconText = icon.icon_title || 'StackAcademy';
  
  return { iconName, iconText };
}

interface HeaderProps {
  variant?: 'landing' | 'app';
  user?: {
    name: string;
    email: string;
    avatar?: string;
    coursesCompleted: number;
    coursesInProgress: number;
  } | null;
  headerData?: HeaderEntry | null; // CMS data
}

// Fallback navigation links
const fallbackLandingNavLinks = [
  { label: 'Home', href: '#hero' },
  { label: 'Features', href: '#features' },
  { label: 'Courses', href: '#courses' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
];

const fallbackHomeNavLinks = [
  { label: 'Home', href: '#top' },
  { label: 'Categories', href: '#categories' },
  { label: 'Courses', href: '#courses' },
  { label: 'Recommended', href: '#recommended' },
];

const fallbackAppNavLinks = [
  { label: 'Home', href: '/home' },
  { label: 'Courses', href: '/courses' },
  { label: 'Categories', href: '/home#categories' },
  { label: 'About Us', href: '/about' },
];

const fallbackProfileMenuItems = [
  { icon: 'user', label: 'My Profile', url: '/profile', isLogout: false },
  { icon: 'book-open', label: 'My Courses', url: '/my-courses', isLogout: false },
  { icon: 'settings', label: 'Settings', url: '/settings', isLogout: false },
  { icon: 'log-out', label: 'Logout', url: '', isLogout: true },
];

export default function Header({ variant = 'landing', user, headerData }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  
  // Get languages from headerData
  const supportedLanguages = headerData?.languages || [];
  const { selectedLanguage, setSelectedLanguage, supportedLanguages: languageOptions } = useLanguage();
  
  // Filter language options to only show supported languages from CMS if available
  const displayLanguages = supportedLanguages.length > 0
    ? languageOptions.filter(lang => supportedLanguages.includes(lang.code))
    : languageOptions;

  const isHomePage = pathname === '/home';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isLanguageOpen &&
        !target.closest(`.${styles.languageWrapper}`)
      ) {
        setIsLanguageOpen(false);
      }
      if (
        isProfileOpen &&
        !target.closest(`.${styles.profileWrapper}`)
      ) {
        setIsProfileOpen(false);
      }
    };

    if (isLanguageOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLanguageOpen, isProfileOpen]);

  // Get logo data from CMS or fallback (icon is a reference)
  const { iconName: logoIconName, iconText: logoText } = getIconData(headerData?.icon);
  const LogoIcon = iconMap[logoIconName] || BookOpen;

  // Get search visibility from CMS or use variant logic
  const showSearch = headerData 
    ? headerData.search_visibility 
    : variant === 'app';

  // Build navigation links from CMS or fallback
  const getNavLinks = () => {
    if (headerData?.navigation?.link && headerData.navigation.link.length > 0) {
      // Use CMS navigation links
      return headerData.navigation.link.map(link => ({
        label: link.title,
        href: link.href,
      }));
    }
    
    // Fallback to hardcoded links
    if (variant === 'landing') {
      return fallbackLandingNavLinks;
    }
    return isHomePage ? fallbackHomeNavLinks : fallbackAppNavLinks;
  };

  const navLinks = getNavLinks();
  
  // Helper to check if a link is an anchor (starts with #)
  const isAnchorLink = (href: string) => href.startsWith('#');

  // Get auth buttons from CMS
  const getAuthButtons = () => {
    if (headerData?.components) {
      const authBlock = headerData.components.find(isAuthButtonsBlock);
      if (authBlock) {
        return {
          login: { 
            text: authBlock.auth_buttons.log_in.title || 'Login', 
            url: authBlock.auth_buttons.log_in.href || '/login' 
          },
          signup: { 
            text: authBlock.auth_buttons.sign_up.title || 'Sign Up', 
            url: authBlock.auth_buttons.sign_up.href || '/signup' 
          },
        };
      }
    }
    return {
      login: { text: 'Login', url: '/login' },
      signup: { text: 'Sign Up', url: '/signup' },
    };
  };

  const authButtons = getAuthButtons();

  // Get profile menu items from CMS
  const getProfileMenuItems = () => {
    if (headerData?.components) {
      const profileBlock = headerData.components.find(isProfileBlock);
      if (profileBlock?.profile_icon?.dropdown_items) {
        return profileBlock.profile_icon.dropdown_items.map((item: ProfileDropdownItem) => ({
          icon: item.icon || 'user',
          label: item.item.title,
          url: item.item.href,
          isLogout: item.item.title.toLowerCase().includes('logout') || 
                   item.item.title.toLowerCase().includes('log out'),
        }));
      }
    }
    return fallbackProfileMenuItems;
  };

  const profileMenuItems = getProfileMenuItems();

  // Get profile trigger icon from CMS
  const getProfileTriggerIcon = () => {
    if (headerData?.components) {
      const profileBlock = headerData.components.find(isProfileBlock);
      if (profileBlock?.profile_icon?.icon) {
        return profileBlock.profile_icon.icon;
      }
    }
    return 'user';
  };

  const profileTriggerIconName = getProfileTriggerIcon();
  const ProfileTriggerIcon = iconMap[profileTriggerIconName] || User;

  // Check if we should show auth buttons or profile
  const hasAuthButtons = () => {
    if (headerData?.components) {
      return headerData.components.some(isAuthButtonsBlock);
    }
    return variant === 'landing';
  };

  const hasProfile = () => {
    if (headerData?.components) {
      return headerData.components.some(isProfileBlock);
    }
    return variant === 'app';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/courses?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const element = document.getElementById(targetId);
      if (element) {
        const yOffset = -80;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else if (targetId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setIsMobileMenuOpen(false);
    }
  };

  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      // Create full-screen logout loading overlay
      const logoutOverlay = document.createElement('div');
      logoutOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        background: var(--neutral-50, #f9fafb);
        z-index: 99999;
      `;
      
      logoutOverlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; margin-bottom: 8px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; animation: pulse 2s ease-in-out infinite; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5M16 21h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 style="font-size: 1.75rem; font-weight: 700; color: #111827; margin: 0; font-family: var(--font-heading, system-ui); animation: fadeIn 0.5s ease-in;">Logging Out</h2>
        <p style="font-size: 1rem; color: #4b5563; margin: 0; animation: fadeIn 0.5s ease-in 0.2s both;">See you soon!</p>
      `;
      
      // Add animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 32px rgba(59, 130, 246, 0.4);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(logoutOverlay);

      // Wait a moment to show the loading screen
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any local storage
      localStorage.removeItem('user');
      localStorage.removeItem('skipped_onboarding');
      
      // Clean up
      if (document.body.contains(logoutOverlay)) {
        document.body.removeChild(logoutOverlay);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      
      // Redirect to landing page
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still redirect even if there's an error
      router.push('/');
    }
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link href={variant === 'landing' ? '/' : '/home'} className={styles.logo}>
          <div className={styles.logoIcon}>
            <LogoIcon size={24} />
          </div>
          <span className={styles.logoText}>{logoText}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
              onClick={(e) => isAnchorLink(link.href) ? scrollToSection(e, link.href) : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Section */}
        <div className={styles.rightSection}>
          {/* Language Selector */}
          {supportedLanguages.length > 0 && (
            <div className={styles.languageWrapper}>
              <button
                className={`${styles.languageButton} ${isLanguageOpen ? styles.active : ''}`}
                onClick={() => {
                  setIsLanguageOpen(!isLanguageOpen);
                  setIsProfileOpen(false);
                }}
                aria-label="Select language"
                title="Change language"
              >
                <Globe size={20} />
              </button>

              {/* Language Dropdown */}
              {isLanguageOpen && (
                <div className={styles.languageDropdown}>
                  <div className={styles.languageDropdownHeader}>
                    <Globe size={16} />
                    <span>Select Language</span>
                  </div>
                  <div className={styles.languageOptionsList}>
                    {displayLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        className={`${styles.languageOption} ${selectedLanguage === lang.code ? styles.active : ''}`}
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setIsLanguageOpen(false);
                        }}
                      >
                        <div className={styles.languageOptionContent}>
                          <span className={styles.languageName}>{lang.name}</span>
                          <span className={styles.languageCodeSmall}>{lang.code.toUpperCase()}</span>
                        </div>
                        {selectedLanguage === lang.code && (
                          <div className={styles.checkmarkWrapper}>
                            <div className={styles.checkmarkIcon}>✓</div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          {showSearch && (
            <form onSubmit={handleSearch} className={styles.searchBar}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </form>
          )}

          {/* Auth Buttons (Landing) or User Profile (App) */}
          {hasAuthButtons() && (
            <div className={styles.authButtons}>
              <Link href={authButtons.login.url} className={styles.loginBtn}>
                {authButtons.login.text}
              </Link>
              <Link href={authButtons.signup.url} className={styles.signupBtn}>
                {authButtons.signup.text}
              </Link>
            </div>
          )}

          {hasProfile() && (
            <div className={styles.userSection}>
              {user ? (
                <div className={styles.profileWrapper}>
                  <button
                    className={styles.profileButton}
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsLanguageOpen(false);
                    }}
                  >
                    <div className={styles.avatar}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <ProfileTriggerIcon size={20} />
                      )}
                    </div>
                    <ChevronDown size={16} className={`${styles.chevron} ${isProfileOpen ? styles.open : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className={styles.profileDropdown}>
                      <div className={styles.profileHeader}>
                        <div className={styles.avatarLarge}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div className={styles.profileInfo}>
                          <h4>{user.name}</h4>
                          <p>{user.email}</p>
                        </div>
                      </div>

                      <div className={styles.profileMenu}>
                        {profileMenuItems.map((item, index) => {
                          const ItemIcon = iconMap[item.icon] || User;
                          
                          if (item.isLogout) {
                            return (
                              <button 
                                key={index} 
                                className={styles.logoutBtn}
                                onClick={handleLogout}
                              >
                                <ItemIcon size={18} />
                                <span>{item.label}</span>
                              </button>
                            );
                          }
                          
                          return (
                            <Link key={index} href={item.url} className={styles.menuItem}>
                              <ItemIcon size={18} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className={styles.signupBtn}>
                  Login
                </Link>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          {showSearch && (
            <form onSubmit={handleSearch} className={styles.mobileSearch}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          )}
          
          <nav className={styles.mobileNav}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={styles.mobileNavLink}
                onClick={(e) => {
                  if (isAnchorLink(link.href)) {
                    scrollToSection(e, link.href);
                  }
                  setIsMobileMenuOpen(false);
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {hasAuthButtons() && (
            <div className={styles.mobileAuthButtons}>
              <Link href={authButtons.login.url} className={styles.loginBtn}>
                {authButtons.login.text}
              </Link>
              <Link href={authButtons.signup.url} className={styles.signupBtn}>
                {authButtons.signup.text}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

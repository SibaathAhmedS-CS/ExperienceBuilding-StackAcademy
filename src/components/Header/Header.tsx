'use client';

import { useState, useEffect, useRef } from 'react';
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
  ProfileDropdownItem,
  CourseEntry
} from '@/types/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';
import lyticsService from '@/services/lytics';
import { clearUserCache } from '@/utils/userCache';
import { useAlgoliaSearch } from '@/hooks/useAlgoliaSearch';
import type { AlgoliaCourseRecord } from '@/lib/algolia';

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
  isLoading?: boolean; // Loading state to prevent flash of auth buttons
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

export default function Header({ variant = 'landing', user, headerData, isLoading = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { results: searchSuggestions, isLoading: isSearching } = useAlgoliaSearch(searchQuery);
  const [activeSection, setActiveSection] = useState<string>('');
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  
  const isHomePage = pathname === '/home';
  const isLandingPage = variant === 'landing' || pathname === '/';
  const isProfilePage = pathname === '/profile';
  const isMyCoursesPage = pathname === '/my-courses';
  const isCoursesPage = pathname === '/courses';
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  
  // Get languages from headerData (accessibility_language contains language and language_tag)
  const accessibilityLanguages = headerData?.accessibility_language || [];
  
  // Build display languages directly from CMS data (language = name, language_tag = code)
  const cmsLanguages = accessibilityLanguages.map(lang => ({
    code: lang.language_tag,
    name: lang.language,
  })).filter(lang => lang.code && lang.name);
  
  // Ensure English is always included as first option if not already present
  const hasEnglish = cmsLanguages.some(lang => lang.code === 'en-us');
  const displayLanguages = hasEnglish 
    ? cmsLanguages 
    : [{ code: 'en-us', name: 'English' }, ...cmsLanguages];
  
  // Show language selector only on home page and when languages are configured in CMS
  const showLanguageSelector = isHomePage && accessibilityLanguages.length > 0;

  // Get search bar visibility from CMS entry data
  // Show search only if:
  // 1. headerData.search_bar is explicitly true (from CMS), AND
  // 2. NOT on profile, my-courses, courses listing, or landing pages
  // Exception: Always hide on profile, my-courses, courses listing, and landing pages regardless of CMS setting
  const showSearch = Boolean(headerData?.search_bar === true 
    && !isProfilePage 
    && !isMyCoursesPage 
    && !isCoursesPage 
    && !isLandingPage);
  
  // Debug logging (can be removed later)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Header] Search visibility:', {
      pathname,
      search_bar: headerData?.search_bar,
      isProfilePage,
      isMyCoursesPage,
      isCoursesPage,
      isLandingPage,
      showSearch,
    });
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer to track active section on landing page
  useEffect(() => {
    if (!isLandingPage) {
      setActiveSection('');
      return;
    }

    const sections = ['hero', 'features', 'courses', 'testimonials', 'faq'];
    const observers: IntersectionObserver[] = [];
    const sectionElements: Map<string, HTMLElement> = new Map();

    // Find all sections
    sections.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        sectionElements.set(sectionId, element);
      }
    });

    // Create intersection observer for each section
    sectionElements.forEach((element, sectionId) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Calculate how much of the section is visible
              const rect = entry.boundingClientRect;
              const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
              const visibilityRatio = visibleHeight / rect.height;

              // Only set as active if at least 30% of the section is visible
              if (visibilityRatio >= 0.3) {
                setActiveSection(sectionId);
              }
            }
          });
        },
        {
          rootMargin: '-20% 0px -60% 0px', // Trigger when section is in the upper portion of viewport
          threshold: [0, 0.3, 0.5, 0.7, 1],
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    // Set initial active section based on scroll position
    const handleInitialScroll = () => {
      const scrollY = window.scrollY;
      let currentSection = 'hero';

      sectionElements.forEach((element, sectionId) => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        
        if (scrollY >= elementTop - 100) {
          currentSection = sectionId;
        }
      });

      setActiveSection(currentSection);
    };

    // Set initial section
    handleInitialScroll();

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [isLandingPage, pathname]);

  // Show suggestions when Algolia returns results
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && searchSuggestions.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, searchSuggestions]);

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
      if (
        showSuggestions &&
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };

    if (isLanguageOpen || isProfileOpen || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLanguageOpen, isProfileOpen, showSuggestions]);

  // Get logo data from CMS or fallback (icon is a reference)
  const { iconName: logoIconName, iconText: logoText } = getIconData(headerData?.icon);
  const LogoIcon = iconMap[logoIconName] || BookOpen;

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
  
  // Helper to determine if a link is active
  const isLinkActive = (href: string) => {
    // Exact match
    if (pathname === href) return true;
    
    // For anchor links on landing page, use scroll-based active section
    if (isAnchorLink(href) && isLandingPage) {
      const sectionId = href.substring(1); // Remove the #
      return activeSection === sectionId;
    }
    
    // For anchor links on other pages, check if we're on the correct page
    if (isAnchorLink(href)) {
      // For home page anchors, check if we're on home
      if (href.startsWith('#') && pathname === '/home') {
        return true;
      }
      return false;
    }
    
    // For routes, check if pathname starts with href
    // This handles cases like /course/[slug] matching /courses
    if (href.startsWith('/') && pathname.startsWith(href)) {
      // But exclude cases where href is just '/' (landing page)
      if (href !== '/') return true;
    }
    
    return false;
  };

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
      setShowSuggestions(false);
      router.push(`/courses?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSuggestionClick = (course: AlgoliaCourseRecord) => {
    setSearchQuery('');
    setShowSuggestions(false);
    router.push(`/course/${course.slug}`);
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

      // Clear user session and set anonymous profile in Lytics before signing out
      lyticsService.clearUser();
      lyticsService.setAnonymousProfile();
      
      // Clear cached user profile
      clearUserCache();
      
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
      
      // Small delay to ensure cookies are cleared, then reload page
      setTimeout(() => {
        window.location.href = '/';
      }, 200);
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
              className={`${styles.navLink} ${isLinkActive(link.href) ? styles.active : ''}`}
              onClick={(e) => isAnchorLink(link.href) ? scrollToSection(e, link.href) : undefined}
            >
              {link.label}
            </a>
          ))}
          
          {/* Language Selector - Only on Home Page */}
          {showLanguageSelector && (
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
        </nav>

        {/* Right Section */}
        <div className={styles.rightSection}>

          {/* Search Bar */}
          {showSearch && (
            <div ref={searchRef} className={styles.searchWrapper}>
              <form onSubmit={handleSearch} className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  className={styles.searchInput}
                />
              </form>
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className={styles.searchSuggestions}>
                  {searchSuggestions.map((course) => (
                    <button
                      key={course.objectID}
                      className={styles.suggestionItem}
                      onClick={() => handleSuggestionClick(course)}
                      type="button"
                    >
                      <Search size={16} className={styles.suggestionIcon} />
                      <div className={styles.suggestionContent}>
                        <span className={styles.suggestionText}>{course.title}</span>
                        {course.instructor_name && (
                          <span className={styles.suggestionMeta}>{course.instructor_name}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isSearching && searchQuery.trim().length >= 2 && (
                <div className={styles.searchSuggestions}>
                  <div className={styles.suggestionItem}>
                    <span className={styles.suggestionText}>Searching...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth Buttons (Landing) or User Profile (App) */}
          {isLoading ? (
            // Loading skeleton to prevent flash
            <div className={styles.loadingSkeleton}>
              <div className={styles.skeletonAvatar}></div>
            </div>
          ) : (
            <>
              {hasAuthButtons() && !user && (
                <div className={styles.authButtons}>
                  <Link href={authButtons.login.url} className={styles.loginBtn}>
                    {authButtons.login.text}
                  </Link>
                  <Link href={authButtons.signup.url} className={styles.signupBtn}>
                    {authButtons.signup.text}
                  </Link>
                </div>
              )}

              {hasProfile() && user && (
                <div className={styles.userSection}>
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
                      <span className={styles.userName}>{user.name}</span>
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
                </div>
              )}
            </>
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
            <div className={styles.mobileSearchWrapper}>
              <form onSubmit={handleSearch} className={styles.mobileSearch}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (searchSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
              </form>
              
              {/* Mobile Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className={styles.mobileSearchSuggestions}>
                  {searchSuggestions.map((course) => (
                    <button
                      key={course.objectID}
                      className={styles.suggestionItem}
                      onClick={() => {
                        handleSuggestionClick(course);
                        setIsMobileMenuOpen(false);
                      }}
                      type="button"
                    >
                      <Search size={16} className={styles.suggestionIcon} />
                      <span className={styles.suggestionText}>{course.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Mobile Navigation */}
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

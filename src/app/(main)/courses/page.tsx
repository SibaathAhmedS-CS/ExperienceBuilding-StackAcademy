'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, Grid, List, ChevronDown, Check } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import CategoryCard from '@/components/CategoryCard';
import { useHeader } from '@/hooks/useHeader';
import { usePage } from '@/hooks/usePage';
import { useCourses, useTransformedCourses, transformCourseToCard } from '@/hooks/useCourses';
import { useAlgoliaSearchFull } from '@/hooks/useAlgoliaSearchFull';
import { getCourseByUid } from '@/lib/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { getCachedUserProfile, cacheUserProfile } from '@/utils/userCache';
import {
  PageEntry,
  CategoryEntry,
  isSearchBlock,
  isCategoryBlock,
  normalizeArray,
} from '@/types/contentstack';
import styles from './page.module.css';

// Sort options
const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
];

// Mock user
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com',
  coursesCompleted: 5,
  coursesInProgress: 3,
};

// Mock data
const categories = [
  { uid: '1', title: 'All Courses', slug: 'all', icon: 'code', courseCount: 1000 },
  { uid: '2', title: 'Development', slug: 'development', icon: 'code', courseCount: 350 },
  { uid: '3', title: 'Data Science', slug: 'data-science', icon: 'chart', courseCount: 120 },
  { uid: '4', title: 'Cloud', slug: 'cloud', icon: 'cloud', courseCount: 95 },
  { uid: '5', title: 'Design', slug: 'design', icon: 'palette', courseCount: 145 },
  { uid: '6', title: 'Business', slug: 'business', icon: 'briefcase', courseCount: 180 },
];

// Helper to extract data from page sections
function extractCoursesPageData(pageData: PageEntry | null) {
  if (!pageData?.section) return null;

  let searchTitle = { title: '', description: '' };
  let searchPlaceholder = '';
  let categories: CategoryEntry[] = [];

  for (const section of pageData.section) {
    if (isSearchBlock(section)) {
      searchTitle = {
        title: section.search_block.search_title?.title || '',
        description: section.search_block.search_title?.description || '',
      };
      searchPlaceholder = section.search_block.placeholder || '';
    }
    if (isCategoryBlock(section)) {
      categories = normalizeArray(section.category_block.category);
    }
  }

  return { searchTitle, searchPlaceholder, categories };
}

// All courses - using real CMS course slugs
const allCourses = [
  {
    uid: 'blt6139b873994abedc',
    title: 'Machine Learning with Python',
    slug: 'machine-learning-python',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600',
    instructorName: 'Michael Chen',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.8,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'AI & ML',
    isFeatured: true,
  },
  {
    uid: 'blte66355d66dec039d',
    title: 'Complete React Developer Course',
    slug: 'react-developer-course',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructorName: 'Sarah Johnson',
    level: 'beginner' as const,
    duration: '35 hours',
    rating: 4.9,
    reviewsCount: 15600,
    studentsEnrolled: 68000,
    category: 'Development',
    isPopular: true,
  },
  {
    uid: 'bltab2bba525506ec98',
    title: 'Python for Data Science',
    slug: 'python-data-science',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Priya Sharma',
    level: 'beginner' as const,
    duration: '40 hours',
    rating: 4.8,
    reviewsCount: 12400,
    studentsEnrolled: 52000,
    category: 'Data Science',
  },
  {
    uid: 'blte671205ef0de57c1',
    title: 'AWS Cloud Practitioner',
    slug: 'aws-cloud-practitioner',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    instructorName: 'David Park',
    level: 'intermediate' as const,
    duration: '45 hours',
    rating: 4.9,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'Cloud',
  },
  {
    uid: 'bltd97014c9501ad853',
    title: 'UX/UI Design Fundamentals',
    slug: 'ux-ui-design-fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600',
    instructorName: 'Emma Wilson',
    level: 'beginner' as const,
    duration: '35 hours',
    rating: 4.7,
    reviewsCount: 6800,
    studentsEnrolled: 24000,
    category: 'Design',
  },
  {
    uid: 'bltc50b57b3e30df2ff',
    title: 'Node.js Backend Masterclass',
    slug: 'nodejs-backend-masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600',
    instructorName: 'Alex Rivera',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.8,
    reviewsCount: 9200,
    studentsEnrolled: 35000,
    category: 'Development',
  },
  {
    uid: 'blt71c92f2be109835e',
    title: 'Docker and Kubernetes Mastery',
    slug: 'docker-kubernetes-mastery',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600',
    instructorName: 'James Liu',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.9,
    reviewsCount: 4500,
    studentsEnrolled: 15000,
    category: 'Cloud',
  },
  {
    uid: 'bltda7ebfbc6896546e',
    title: 'Cybersecurity Essentials',
    slug: 'cybersecurity-essentials',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
    instructorName: 'Ryan Martinez',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.8,
    reviewsCount: 11200,
    studentsEnrolled: 38000,
    category: 'Development',
  },
  {
    uid: 'blt414230d56bd1814a',
    title: 'TypeScript Complete Guide',
    slug: 'typescript-complete-guide',
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600',
    instructorName: 'Sarah Johnson',
    level: 'intermediate' as const,
    duration: '32 hours',
    rating: 4.8,
    reviewsCount: 7500,
    studentsEnrolled: 29000,
    category: 'Development',
  },
  {
    uid: 'blt57a57969f61b47b6',
    title: 'CSS Mastery - Modern Styling',
    slug: 'css-mastery',
    thumbnail: 'https://images.unsplash.com/photo-1523437113738-bbd3cc89fb19?w=600',
    instructorName: 'Emma Wilson',
    level: 'beginner' as const,
    duration: '28 hours',
    rating: 4.7,
    reviewsCount: 5800,
    studentsEnrolled: 21000,
    category: 'Design',
  },
  {
    uid: 'bltd1f8baf99413cc1b',
    title: 'iOS App Development with Swift',
    slug: 'ios-app-development-swift',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600',
    instructorName: 'Jennifer Brown',
    level: 'intermediate' as const,
    duration: '40 hours',
    rating: 4.8,
    reviewsCount: 6200,
    studentsEnrolled: 18000,
    category: 'Development',
  },
  {
    uid: 'blt86c43d873f1afca4',
    title: 'Android Development with Kotlin',
    slug: 'android-development-kotlin',
    thumbnail: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=600',
    instructorName: 'Jennifer Brown',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.8,
    reviewsCount: 5900,
    studentsEnrolled: 17000,
    category: 'Development',
  },
  {
    uid: 'blt953da9493d887836',
    title: 'SQL Database Mastery',
    slug: 'sql-database-mastery',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600',
    instructorName: 'Robert Kim',
    level: 'beginner' as const,
    duration: '30 hours',
    rating: 4.7,
    reviewsCount: 8100,
    studentsEnrolled: 32000,
    category: 'Data Science',
  },
];

export default function CoursesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Get search query from URL params or use empty string
  const urlSearchQuery = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');
  
  // Fetch page data from Contentstack
  const { pageData, isLoading } = usePage('Courses Page');
  
  // Fetch courses from CMS
  const { courses: cmsCourses, isLoading: coursesLoading } = useCourses();
  
  // Transform CMS courses to card format with real review/enrollment data
  const { transformedCourses: cmsCoursesForCards, isTransforming } = useTransformedCourses(cmsCourses);

  // Algolia search - only search if query is 2+ characters
  const { results: algoliaResults, isLoading: isAlgoliaSearching } = useAlgoliaSearchFull(
    searchQuery.trim().length >= 2 ? searchQuery : '',
    50 // Get more results for full page search
  );

  const { selectedLanguage } = useLanguage();
  const [algoliaCoursesData, setAlgoliaCoursesData] = useState<any[]>([]);
  const [isLoadingAlgoliaCourses, setIsLoadingAlgoliaCourses] = useState(false);

  // Determine if we're searching
  const isSearching = searchQuery.trim().length >= 2;

  // Fetch full course data from Contentstack when Algolia results change
  useEffect(() => {
    async function fetchAlgoliaCourses() {
      if (!isSearching || algoliaResults.length === 0) {
        setAlgoliaCoursesData([]);
        return;
      }

      setIsLoadingAlgoliaCourses(true);
      try {
        // Fetch full course data from Contentstack for each Algolia result
        const coursePromises = algoliaResults.map(async (result) => {
          try {
            const fullCourse = await getCourseByUid(result.objectID, selectedLanguage);
            if (fullCourse) {
              // Transform to card format with all rich data
              return await transformCourseToCard(fullCourse);
            }
            return null;
          } catch (error) {
            console.error(`Error fetching course ${result.objectID}:`, error);
            return null;
          }
        });

        const courses = await Promise.all(coursePromises);
        // Filter out null results
        setAlgoliaCoursesData(courses.filter((c): c is NonNullable<typeof c> => c !== null));
      } catch (error) {
        console.error('Error fetching Algolia courses from Contentstack:', error);
        setAlgoliaCoursesData([]);
      } finally {
        setIsLoadingAlgoliaCourses(false);
      }
    }

    fetchAlgoliaCourses();
  }, [algoliaResults, selectedLanguage, isSearching]);

  // Extract page section data
  const coursesPageData = extractCoursesPageData(pageData);
  const hasCMSSearch = coursesPageData && coursesPageData.searchTitle.title;
  const hasCMSCategories = coursesPageData && coursesPageData.categories.length > 0;

  // Sync URL search param with local state
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [searchParams]);

  // Update URL when search query changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (searchQuery !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery.trim()) {
        params.set('search', searchQuery);
      } else {
        params.delete('search');
      }
      router.replace(`/courses?${params.toString()}`, { scroll: false });
    }
  }, [searchQuery, router, searchParams]);

  useEffect(() => {
    async function fetchUserData() {
      setIsLoadingUser(true);
      try {
        // Clear old localStorage 'user' key if it exists (might contain mock data)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
        
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Check cache first for instant display
          const cachedProfile = getCachedUserProfile(authUser.id);
          if (cachedProfile) {
            setUser(cachedProfile);
            setIsLoadingUser(false); // Show cached data immediately
          }

          // Fetch fresh data from Supabase in the background
          const [profileResult, enrollmentsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', authUser.id)
              .maybeSingle(),
            supabase
              .from('enrollments')
              .select('status')
              .eq('user_id', authUser.id)
          ]);

          const profile = profileResult.data;
          const enrollments = enrollmentsResult.data;

          const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
          const inProgressCount = enrollments?.filter(e => e.status === 'enrolled').length || 0;

          const userData = {
            name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            avatar: profile?.avatar_url || undefined,
            coursesCompleted: completedCount,
            coursesInProgress: inProgressCount,
          };
          
          // Update cache with fresh data
          cacheUserProfile(authUser.id, userData);
          
          // Update UI with fresh data (only if cache wasn't available or data changed)
          if (!cachedProfile || JSON.stringify(cachedProfile) !== JSON.stringify(userData)) {
            setUser(userData);
          }
          
          setIsLoadingUser(false);
        } else {
          // User not authenticated - don't set any user data
          setUser(null);
          setIsLoadingUser(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Don't set mock user on error
        setUser(null);
        setIsLoadingUser(false);
      }
    }

    fetchUserData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convert CMS categories to display format with "All Courses" at front
  const displayCategories = hasCMSCategories
    ? [
        { uid: '0', title: 'All Courses', slug: 'all', icon: 'code', courseCount: 1000 },
        ...coursesPageData.categories.map((cat, index) => ({
          uid: cat.uid,
          title: cat.title,
          slug: cat.taxonomies?.[0]?.term_uid || cat.title.toLowerCase().replace(/\s+/g, '-'),
          icon: cat.category_icon || 'code',
          courseCount: 100 + (index * 25),
        })),
      ]
    : categories;

  // Determine which courses to display
  // If searching with Algolia, use full course data fetched from Contentstack
  // Otherwise, use CMS courses or fallback to static data
  let displayCourses;
  if (isSearching) {
    // Use the full course data fetched from Contentstack (with images, ratings, etc.)
    displayCourses = algoliaCoursesData;
  } else {
    // Not searching - use CMS courses or fallback
    displayCourses = cmsCoursesForCards.length > 0 ? cmsCoursesForCards : allCourses;
  }
  
  // Filter courses by category (only if not searching with Algolia)
  const filteredCourses = isSearching
    ? displayCourses // Don't filter when searching - Algolia handles it
    : displayCourses.filter(course => {
        const courseCategory = course.category?.toLowerCase().replace(/[_ ]/g, '-') || '';
        const matchesCategory = selectedCategory === 'all' || 
          courseCategory.includes(selectedCategory.replace(/_/g, '-'));
        return matchesCategory;
      });

  // Sort courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.studentsEnrolled - a.studentsEnrolled;
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return 0; // Would use date in real implementation
      default:
        return 0;
    }
  });

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} isLoading={isLoadingUser} />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <h1>
              {hasCMSSearch ? coursesPageData.searchTitle.title : 'Explore Our Courses'}
            </h1>
            <p>
              {hasCMSSearch 
                ? coursesPageData.searchTitle.description 
                : 'Discover 1000+ courses to advance your skills and career'}
            </p>
          </div>
        </section>

        {/* Filters & Content */}
        <section className={styles.content}>
          <div className="container">
            {/* Category Tabs - Hide when searching */}
            {!isSearching && (
              <div className={styles.categoryTabs}>
                {displayCategories.map((category) => (
                  <CategoryCard
                    key={category.uid}
                    {...category}
                    variant="button"
                    isActive={selectedCategory === category.slug}
                    onClick={() => setSelectedCategory(category.slug)} 
                  />
                ))}
              </div>
            )}

            {/* Results Header */}
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                {isSearching ? (
                  <>
                    <strong>{sortedCourses.length}</strong> {sortedCourses.length === 1 ? 'course' : 'courses'} found
                    {searchQuery && ` for "${searchQuery}"`}
                  </>
                ) : (
                  <>
                    <strong>{sortedCourses.length}</strong> courses found
                  </>
                )}
              </p>

              <div className={styles.controls}>
                {/* Sort Dropdown */}
                <div className={styles.sortDropdown} ref={dropdownRef}>
                  <button 
                    className={styles.dropdownButton}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    type="button"
                  >
                    <Filter size={18} />
                    <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                    <ChevronDown size={16} className={isDropdownOpen ? styles.rotated : ''} />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenu}>
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          className={`${styles.dropdownItem} ${sortBy === option.value ? styles.selected : ''}`}
                          onClick={() => {
                            setSortBy(option.value);
                            setIsDropdownOpen(false);
                          }}
                          type="button"
                        >
                          <span>{option.label}</span>
                          {sortBy === option.value && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* View Toggle */}
                <div className={styles.viewToggle}>
                  <button
                    className={viewMode === 'grid' ? styles.active : ''}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    className={viewMode === 'list' ? styles.active : ''}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Course Grid */}
            {(isAlgoliaSearching || isLoadingAlgoliaCourses) && searchQuery.trim().length >= 2 ? (
              <div className={styles.noResults}>
                <Search size={48} />
                <h3>Searching courses...</h3>
                <p>Please wait while we find the best matches</p>
              </div>
            ) : sortedCourses.length > 0 ? (
              <div className={`${styles.coursesGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
                {sortedCourses.map((course) => (
                  <CourseCard 
                    key={course.uid} 
                    {...course} 
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.noResults}>
                <Search size={48} />
                <h3>No courses found</h3>
                <p>
                  {isSearching 
                    ? `No courses found for "${searchQuery}". Try a different search term.`
                    : 'Try adjusting your search or filter criteria'}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

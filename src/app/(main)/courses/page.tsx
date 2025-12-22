'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, ChevronDown } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CourseCard from '@/components/CourseCard';
import CategoryCard from '@/components/CategoryCard';
import { useHeader } from '@/hooks/useHeader';
import styles from './page.module.css';

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

const allCourses = [
  {
    uid: '1',
    title: 'Complete React Developer Course',
    slug: 'complete-react-developer',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600',
    instructorName: 'Sarah Johnson',
    level: 'intermediate' as const,
    duration: '42 hours',
    rating: 4.9,
    reviewsCount: 15600,
    studentsEnrolled: 68000,
    category: 'Development',
    isPopular: true,
  },
  {
    uid: '2',
    title: 'Python for Data Science & ML',
    slug: 'python-data-science-ml',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    instructorName: 'Michael Chen',
    level: 'beginner' as const,
    duration: '55 hours',
    rating: 4.8,
    reviewsCount: 12400,
    studentsEnrolled: 52000,
    category: 'Data Science',
    isFeatured: true,
  },
  {
    uid: '3',
    title: 'AWS Solutions Architect Pro',
    slug: 'aws-solutions-architect-pro',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    instructorName: 'David Park',
    level: 'advanced' as const,
    duration: '48 hours',
    rating: 4.9,
    reviewsCount: 8900,
    studentsEnrolled: 28000,
    category: 'Cloud',
  },
  {
    uid: '4',
    title: 'UI/UX Design Fundamentals',
    slug: 'uiux-design-fundamentals',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600',
    instructorName: 'Emma Wilson',
    level: 'beginner' as const,
    duration: '32 hours',
    rating: 4.7,
    reviewsCount: 6800,
    studentsEnrolled: 24000,
    category: 'Design',
  },
  {
    uid: '5',
    title: 'Node.js & Express Masterclass',
    slug: 'nodejs-express-masterclass',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600',
    instructorName: 'Alex Rivera',
    level: 'intermediate' as const,
    duration: '38 hours',
    rating: 4.8,
    reviewsCount: 9200,
    studentsEnrolled: 35000,
    category: 'Development',
  },
  {
    uid: '6',
    title: 'Kubernetes in Production',
    slug: 'kubernetes-production',
    thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600',
    instructorName: 'James Liu',
    level: 'advanced' as const,
    duration: '28 hours',
    rating: 4.9,
    reviewsCount: 4500,
    studentsEnrolled: 15000,
    category: 'Cloud',
  },
  {
    uid: '7',
    title: 'Digital Marketing Complete',
    slug: 'digital-marketing-complete',
    thumbnail: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f5a070?w=600',
    instructorName: 'Lisa Anderson',
    level: 'beginner' as const,
    duration: '45 hours',
    rating: 4.6,
    reviewsCount: 7800,
    studentsEnrolled: 42000,
    category: 'Business',
  },
  {
    uid: '8',
    title: 'Ethical Hacking Complete',
    slug: 'ethical-hacking-complete',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
    instructorName: 'Ryan Martinez',
    level: 'intermediate' as const,
    duration: '52 hours',
    rating: 4.8,
    reviewsCount: 11200,
    studentsEnrolled: 38000,
    category: 'Development',
  },
];

export default function CoursesPage() {
  const [user, setUser] = useState<typeof mockUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Fetch header data from Contentstack
  const { headerData } = useHeader('App Header');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(mockUser);
    }
  }, []);

  // Filter courses
  const filteredCourses = allCourses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || 
      course.category.toLowerCase().replace(' ', '-') === selectedCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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
      <Header variant="app" user={user} headerData={headerData} />

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <h1>Explore Our Courses</h1>
            <p>Discover 1000+ courses to advance your skills and career</p>
            
            {/* Search Bar */}
            <div className={styles.searchWrapper}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search courses, instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Filters & Content */}
        <section className={styles.content}>
          <div className="container">
            {/* Category Tabs */}
            <div className={styles.categoryTabs}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.uid}
                  {...category}
                  variant="button"
                  isActive={selectedCategory === category.slug}
                  onClick={() => setSelectedCategory(category.slug)}
                />
              ))}
            </div>

            {/* Results Header */}
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                <strong>{sortedCourses.length}</strong> courses found
              </p>

              <div className={styles.controls}>
                {/* Sort Dropdown */}
                <div className={styles.sortDropdown}>
                  <Filter size={18} />
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest</option>
                  </select>
                  <ChevronDown size={16} />
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
            {sortedCourses.length > 0 ? (
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
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

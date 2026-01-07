'use client';

import { useState, useEffect } from 'react';
import { getAllCourses } from '@/lib/contentstack';
import { CourseEntry } from '@/types/contentstack';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCourseReviewStats, getCourseEnrollmentCount } from '@/services/reviews';

export function useCourses() {
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { selectedLanguage } = useLanguage();

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const data = await getAllCourses(selectedLanguage);
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
        console.error('Error fetching courses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, [selectedLanguage]);

  return { courses, isLoading, error };
}

// Hook to transform courses with real review and enrollment data
export function useTransformedCourses(courses: CourseEntry[]) {
  const [transformedCourses, setTransformedCourses] = useState<TransformedCourse[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);

  useEffect(() => {
    async function transformAllCourses() {
      if (courses.length === 0) {
        setTransformedCourses([]);
        return;
      }

      setIsTransforming(true);
      try {
        const transformed = await Promise.all(
          courses.map(course => transformCourseToCard(course))
        );
        setTransformedCourses(transformed);
      } catch (error) {
        console.error('Error transforming courses:', error);
        // Fallback to empty array on error
        setTransformedCourses([]);
      } finally {
        setIsTransforming(false);
      }
    }

    transformAllCourses();
  }, [courses]);

  return { transformedCourses, isTransforming };
}

// Transformed course card type
export interface TransformedCourse {
  uid: string;
  title: string;
  slug: string;
  thumbnail: string;
  instructorName: string;
  instructorAvatar?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  rating: number;
  reviewsCount: number;
  studentsEnrolled: number;
  category: string;
  isFeatured?: boolean;
  isPopular?: boolean;
}

// Helper function to transform CMS course to card format
export async function transformCourseToCard(course: CourseEntry): Promise<TransformedCourse> {
  // Get author name from reference (AuthorEntry uses 'title' for the name)
  const author = Array.isArray(course.author) ? course.author[0] : course.author;
  const authorName = author?.title || 'Unknown Instructor';

  // Get author avatar/picture - check multiple possible field names
  const instructorAvatar = 
    (author as any)?.picture?.url || 
    (author as any)?.profile_image?.url || 
    (author as any)?.profile_image_link?.href || 
    (author as any)?.picture?.href ||
    undefined;

  // Get thumbnail from course_image_link
  const thumbnail = course.course_image_link?.href || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600';

  // Map difficulty level to lowercase
  const levelMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    'Beginner': 'beginner',
    'Intermediate': 'intermediate',
    'Advanced': 'advanced',
  };

  // Fetch real review stats and enrollment count from database
  let rating = 0;
  let reviewsCount = 0;
  let studentsEnrolled = 0;

  try {
    const reviewStats = await getCourseReviewStats(course.uid);
    rating = reviewStats.averageRating;
    reviewsCount = reviewStats.totalReviews;

    const enrollmentCount = await getCourseEnrollmentCount(course.uid);
    studentsEnrolled = enrollmentCount;
  } catch (error) {
    console.error(`Error fetching stats for course ${course.uid}:`, error);
    // Fallback to 0 if there's an error
  }

  // Determine featured/popular status from CMS fields first, then fallback to dynamic calculation
  // Priority: CMS fields > dynamic calculation based on real data
  let isFeatured = course.is_featured ?? false;
  let isPopular = course.is_popular ?? false;

  // If not set in CMS, determine dynamically based on real data
  // Featured: High rating (>= 4.8) and good enrollment (>= 20000)
  // Popular: High enrollment (>= 30000) or high reviews (>= 10000)
  if (!course.is_featured && !course.is_popular) {
    if (rating >= 4.8 && studentsEnrolled >= 20000) {
      isFeatured = true;
    }
    if (studentsEnrolled >= 30000 || reviewsCount >= 10000) {
      isPopular = true;
    }
  }

  return {
    uid: course.uid,
    title: course.title,
    slug: course.slug || course.uid, // Fallback to uid if slug is missing
    thumbnail,
    instructorName: authorName,
    instructorAvatar,
    level: levelMap[course.difficulty_level] || 'beginner',
    duration: `${course.total_duration || course.duration || 0} hours`,
    rating,
    reviewsCount,
    studentsEnrolled,
    category: course.taxonomies?.[0]?.term_uid || 'development',
    isFeatured,
    isPopular,
  };
}


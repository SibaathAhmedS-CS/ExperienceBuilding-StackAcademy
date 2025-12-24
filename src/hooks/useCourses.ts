'use client';

import { useState, useEffect } from 'react';
import { getAllCourses } from '@/lib/contentstack';
import { CourseEntry } from '@/types/contentstack';

export function useCourses() {
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const data = await getAllCourses();
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
        console.error('Error fetching courses:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, []);

  return { courses, isLoading, error };
}

// Transformed course card type
export interface TransformedCourse {
  uid: string;
  title: string;
  slug: string;
  thumbnail: string;
  instructorName: string;
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
export function transformCourseToCard(course: CourseEntry): TransformedCourse {
  // Get author name from reference
  const author = Array.isArray(course.author) ? course.author[0] : course.author;
  const authorName = author?.name || 'Unknown Instructor';

  // Get thumbnail from course_image_link
  const thumbnail = course.course_image_link?.href || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600';

  // Map difficulty level to lowercase
  const levelMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
    'Beginner': 'beginner',
    'Intermediate': 'intermediate',
    'Advanced': 'advanced',
  };

  return {
    uid: course.uid,
    title: course.title,
    slug: course.slug || course.uid, // Fallback to uid if slug is missing
    thumbnail,
    instructorName: authorName,
    level: levelMap[course.difficulty_level] || 'beginner',
    duration: `${course.total_duration || course.duration || 0} hours`,
    // These will come from DB later
    rating: 4.5 + Math.random() * 0.4, // Mock rating between 4.5-4.9
    reviewsCount: Math.floor(Math.random() * 10000) + 1000, // Mock reviews
    studentsEnrolled: Math.floor(Math.random() * 50000) + 5000, // Mock students
    category: course.taxonomies?.[0]?.term_uid || 'development',
    isFeatured: course.taxonomies?.some(t => t.term_uid === 'ai_ml' || t.term_uid === 'data_science'),
    isPopular: course.taxonomies?.some(t => t.term_uid === 'development'),
  };
}


// services/interestTracking.ts
'use client';

/**
 * Track user course interests for Contentstack Personalize
 * Stores course interests in localStorage and Personalize SDK
 */

export interface UserCourseInterest {
  courses_viewed: string[];        // Course titles
  course_uids: string[];           // Course UIDs for more accuracy
  categories_explored: string[];   // Categories user has explored
  difficulty_levels: string[];      // Difficulty levels viewed
}

const STORAGE_KEY = 'stackacademy_user_course_interests';

/**
 * Get user course interests from localStorage
 */
export function getUserCourseInterests(): UserCourseInterest {
  if (typeof window === 'undefined') {
    return {
      courses_viewed: [],
      course_uids: [],
      categories_explored: [],
      difficulty_levels: [],
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading user course interests:', error);
  }

  return {
    courses_viewed: [],
    course_uids: [],
    categories_explored: [],
    difficulty_levels: [],
  };
}

/**
 * Save user course interests to localStorage
 */
function saveUserCourseInterests(interests: UserCourseInterest) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(interests));
  } catch (error) {
    console.error('Error saving user course interests:', error);
  }
}

/**
 * Track when user views a course
 */
export async function trackCourseView(
  personalizeSdk: any,
  courseData: {
    uid: string;
    title: string;
    category?: string;
    difficulty_level?: string;
  }
) {
  if (typeof window === 'undefined' || !personalizeSdk) return;

  // Get existing interests
  let interests: UserCourseInterest = getUserCourseInterests();

  // Update courses viewed: if exists, move to end (most recent); if not, add to end
  const existingIndex = interests.courses_viewed.indexOf(courseData.title);
  if (existingIndex !== -1) {
    interests.courses_viewed.splice(existingIndex, 1);
  }
  interests.courses_viewed.push(courseData.title);
  // Keep only last 10 courses
  if (interests.courses_viewed.length > 10) {
    interests.courses_viewed = interests.courses_viewed.slice(-10);
  }

  // Update course UIDs
  const existingUidIndex = interests.course_uids.indexOf(courseData.uid);
  if (existingUidIndex !== -1) {
    interests.course_uids.splice(existingUidIndex, 1);
  }
  interests.course_uids.push(courseData.uid);
  if (interests.course_uids.length > 10) {
    interests.course_uids = interests.course_uids.slice(-10);
  }

  // Update categories
  if (courseData.category && !interests.categories_explored.includes(courseData.category)) {
    interests.categories_explored.push(courseData.category);
  }

  // Update difficulty levels
  if (courseData.difficulty_level && !interests.difficulty_levels.includes(courseData.difficulty_level)) {
    interests.difficulty_levels.push(courseData.difficulty_level);
  }

  // Save to localStorage
  saveUserCourseInterests(interests);

  // Update Personalize SDK attributes (non-blocking, handle network errors gracefully)
  personalizeSdk.set({
    preferred_courses: interests.courses_viewed,
    preferred_course_uids: interests.course_uids,
    preferred_categories: interests.categories_explored,
    preferred_difficulty_levels: interests.difficulty_levels,
    last_course_viewed: courseData.title,
    last_course_uid: courseData.uid,
    courses_viewed_count: interests.courses_viewed.length,
  }).catch((error: any) => {
    // Silently handle network errors
    if (process.env.NODE_ENV === 'development') {
      const isNetworkError = error?.message?.includes('Failed to fetch') || 
                             error?.message?.includes('ERR_NETWORK_CHANGED') ||
                             error?.name === 'TypeError';
      if (!isNetworkError) {
        console.warn('⚠️ Error syncing to Personalize SDK (non-critical):', error);
      }
    }
  });

  return interests;
}

/**
 * Track when user clicks on a course
 * Sends event to Lytics for analytics and personalization
 */
export function trackCourseClick(
  courseData: {
    uid: string;
    title: string;
    slug: string;
    category?: string;
    difficulty_level?: string;
    instructorName?: string;
  }
) {
  if (typeof window === 'undefined') return;

  // Check if Lytics is available
  const checkAndSendEvent = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag) {
      // Lytics not loaded yet, retry after a short delay
      setTimeout(checkAndSendEvent, 100);
      return;
    }
  
    // Check if jstag has send method
    if (typeof jstag.send !== 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ jstag.send is not a function');
      }
      return;
    }
  
    try {
      // Prepare event data
      const eventData: Record<string, any> = {
        course_uid: courseData.uid,
        course_title: courseData.title,
        course_slug: courseData.slug,
        timestamp: new Date().toISOString(),
      };
  
      // Add optional fields
      if (courseData.category) {
        eventData.course_category = courseData.category;
      }
      if (courseData.difficulty_level) {
        eventData.course_difficulty = courseData.difficulty_level;
      }
      if (courseData.instructorName) {
        eventData.course_instructor = courseData.instructorName;
      }
  
      // Send event to Lytics using jstag.send()
      jstag.send({
        _e: "course_clicked", // Event name
        ...eventData
      });
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Course click tracked to Lytics:', eventData);
      }
    } catch (error) {
      // Handle errors gracefully
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error tracking course click to Lytics:', error);
      }
    }
  };
  
  // Start checking for Lytics
  checkAndSendEvent();
}


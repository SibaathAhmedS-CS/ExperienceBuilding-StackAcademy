// services/interestTracking.ts
'use client';

/**
 * Track user course interests for Contentstack Personalize
 * Stores course interests in localStorage and Personalize SDK
 * Similar to destination tracking but for course preferences
 */

export interface UserCourseInterest {
  topics: string[];              // e.g., ['css', 'python', 'react']
  topic_uids: string[];          // Topic UIDs for more accuracy
  categories: string[];          // Course categories user has explored
  courses_viewed: string[];      // Course slugs user has viewed
  courses_clicked: string[];     // Course slugs user has clicked
  last_course_viewed?: string;   // Most recently viewed course slug
  last_topic_viewed?: string;   // Most recently viewed topic
}

const STORAGE_KEY = 'stackacademy_user_course_interests';

/**
 * Get user course interests from localStorage
 */
export function getUserCourseInterests(): UserCourseInterest {
  if (typeof window === 'undefined') {
    return {
      topics: [],
      topic_uids: [],
      categories: [],
      courses_viewed: [],
      courses_clicked: [],
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
    topics: [],
    topic_uids: [],
    categories: [],
    courses_viewed: [],
    courses_clicked: [],
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
 * Updates localStorage and Personalize SDK attributes
 */
export async function trackCourseView(
  personalizeSdk: any,
  courseData: {
    slug: string;
    title: string;
    topic?: string | string[];  // Topic slug(s)
    topic_uid?: string | string[]; // Topic UID(s)
    category?: string;
  }
) {
  if (typeof window === 'undefined' || !personalizeSdk) return;

  // Get existing interests
  let interests: UserCourseInterest = getUserCourseInterests();

  // Update courses_viewed: if exists, move to end (most recent); if not, add to end
  const existingIndex = interests.courses_viewed.indexOf(courseData.slug);
  if (existingIndex !== -1) {
    // Remove from current position
    interests.courses_viewed.splice(existingIndex, 1);
  }
  // Add to end (most recent)
  interests.courses_viewed.push(courseData.slug);
  // Keep only last 10 courses viewed
  if (interests.courses_viewed.length > 10) {
    interests.courses_viewed = interests.courses_viewed.slice(-10);
  }

  // Update topics
  const topicsToAdd = Array.isArray(courseData.topic) ? courseData.topic : [courseData.topic].filter(Boolean);
  topicsToAdd.forEach((topic) => {
    if (topic && !interests.topics.includes(topic)) {
      interests.topics.push(topic);
      // Keep only last 10 topics
      if (interests.topics.length > 10) {
        interests.topics = interests.topics.slice(-10);
      }
    }
  });

  // Update topic UIDs
  const topicUidsToAdd = Array.isArray(courseData.topic_uid) 
    ? courseData.topic_uid 
    : [courseData.topic_uid].filter(Boolean);
  topicUidsToAdd.forEach((uid) => {
    if (uid && !interests.topic_uids.includes(uid)) {
      interests.topic_uids.push(uid);
      if (interests.topic_uids.length > 10) {
        interests.topic_uids = interests.topic_uids.slice(-10);
      }
    }
  });

  // Update categories
  if (courseData.category && !interests.categories.includes(courseData.category)) {
    interests.categories.push(courseData.category);
    if (interests.categories.length > 10) {
      interests.categories = interests.categories.slice(-10);
    }
  }

  // Update last viewed
  interests.last_course_viewed = courseData.slug;
  if (topicsToAdd.length > 0) {
    interests.last_topic_viewed = topicsToAdd[topicsToAdd.length - 1];
  }

  // Save to localStorage
  saveUserCourseInterests(interests);

  // Update Personalize SDK attributes (non-blocking, handle network errors gracefully)
  personalizeSdk.set({
    preferred_topics: interests.topics,
    preferred_topic_uids: interests.topic_uids,
    preferred_categories: interests.categories,
    courses_viewed: interests.courses_viewed,
    courses_viewed_count: interests.courses_viewed.length,
    last_course_viewed: courseData.slug,
    last_topic_viewed: interests.last_topic_viewed,
  }).catch((error: any) => {
    // Silently handle network errors (ERR_NETWORK_CHANGED, Failed to fetch)
    // These are common during navigation and don't affect functionality
    // localStorage is already updated, so the tracking still works
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
 * Also updates localStorage and Personalize SDK
 */
export async function trackCourseClick(
  personalizeSdk: any,
  courseData: {
    slug: string;
    title: string;
    topic?: string | string[];
    topic_uid?: string | string[];
    category?: string;
    url?: string;
  }
) {
  if (typeof window === 'undefined') return;

  // Update localStorage and Personalize SDK (similar to trackCourseView)
  if (personalizeSdk) {
    await trackCourseView(personalizeSdk, courseData);
  }

  // Also track in courses_clicked
  const interests = getUserCourseInterests();
  const existingIndex = interests.courses_clicked.indexOf(courseData.slug);
  if (existingIndex !== -1) {
    interests.courses_clicked.splice(existingIndex, 1);
  }
  interests.courses_clicked.push(courseData.slug);
  if (interests.courses_clicked.length > 10) {
    interests.courses_clicked = interests.courses_clicked.slice(-10);
  }
  saveUserCourseInterests(interests);

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
        _e: 'course_clicked', // Event name
        course_slug: courseData.slug,
        course_title: courseData.title,
        timestamp: new Date().toISOString(),
      };
  
      // Add optional fields
      if (courseData.topic) {
        eventData.course_topics = Array.isArray(courseData.topic) 
          ? courseData.topic 
          : [courseData.topic];
      }
      if (courseData.category) {
        eventData.course_category = courseData.category;
      }
      if (courseData.url) {
        eventData.course_url = courseData.url;
      }
  
      // Send event to Lytics using jstag.send()
      jstag.send(eventData);
      
      // Log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Course click tracked to Lytics:', eventData);
      }
    } catch (error) {
      // Handle errors gracefully - don't break the click functionality
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error tracking course click to Lytics:', error);
      }
    }
  };
  
  // Start checking for Lytics
  checkAndSendEvent();
}

/**
 * Sync user preferences to Personalize SDK
 * Called after onboarding or when preferences are updated
 */
export async function syncPreferencesToPersonalize(
  personalizeSdk: any,
  preferences: {
    goal?: string | null;
    role?: string | null;
    education?: string | null;
    topics?: string[] | null;
    daily_goal_minutes?: number | null;
  }
) {
  if (typeof window === 'undefined' || !personalizeSdk) return;

  try {
    const attributes: Record<string, any> = {};

    if (preferences.goal) attributes.goal = preferences.goal;
    if (preferences.role) attributes.role = preferences.role;
    if (preferences.education) attributes.education = preferences.education;
    if (preferences.topics && preferences.topics.length > 0) {
      attributes.topics = preferences.topics;
      attributes.preferred_topics = preferences.topics; // Also set as preferred_topics
    }
    if (preferences.daily_goal_minutes) {
      attributes.daily_goal_minutes = preferences.daily_goal_minutes;
    }

    // Update Personalize SDK attributes
    await personalizeSdk.set(attributes);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Preferences synced to Personalize SDK:', attributes);
    }
  } catch (error) {
    // Handle errors gracefully
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error syncing preferences to Personalize SDK:', error);
    }
  }
}


/**
 * Sample Lytics Event Examples
 * Based on your actual payload structure
 */

import { sendEvent, identifyUser } from './lytics';

/**
 * Example 1: Identify Event with Preferences (Based on your payload)
 * This matches the structure you provided
 */
export function sendIdentifyEventWithPreferences() {
  sendEvent({
    // Event type - required
    _e: 'identify',
    
    // User identification
    email: 'akshayadk@student.tce.edu',
    user_id: '2057a6d5-b179-4cab-a2bb-4246e2747edc',
    full_name: 'KittyDk',
    
    // User preferences (from onboarding)
    goal: 'explore-for-fun',
    role: 'ux-designer',
    education: 'bachelor-s-degree',
    schedule: '15',
    daily_goal_minutes: 15, // Convert string to number for consistency
    topics: [
      'bltcc0d1eaf4995b51c',
      'bltef2d018391c2a0f6'
    ],
    
    // Mapped Lytics field names (for audience matching)
    career_intent: 'explore-for-fun',      // Maps from goal
    job_role: 'ux-designer',                // Maps from role
    education_background: 'bachelor-s-degree', // Maps from education
    minutes_per_day_target: 15,            // Maps from daily_goal_minutes
    
    // Current page context
    url: typeof window !== 'undefined' ? window.location.href : '',
    
    // Note: System fields like _cc, _device, _ip, _ts, _uid, etc.
    // are automatically added by Lytics SDK - you don't need to include them
  });
}

/**
 * Example 2: Using identifyUser() helper (Recommended)
 * This is cleaner and handles field mapping automatically
 */
export function identifyUserWithPreferences() {
  identifyUser({
    email: 'akshayadk@student.tce.edu',
    user_id: '2057a6d5-b179-4cab-a2bb-4246e2747edc',
    full_name: 'KittyDk',
    
    // Preferences
    goal: 'explore-for-fun',
    role: 'ux-designer',
    education: 'bachelor-s-degree',
    schedule: '15',
    daily_goal_minutes: 15,
    topics: [
      'bltcc0d1eaf4995b51c',
      'bltef2d018391c2a0f6'
    ],
    
    // Optional: Enrollment data
    courses_enrolled: ['react-basics', 'python-fundamentals'],
    courses_completed: ['html-css-basics'],
    categories_explored: ['programming', 'web-development'],
  });
}

/**
 * Example 3: Course View Event with Preferences Context
 */
export function sendCourseViewEvent(courseSlug: string, courseTitle: string, courseCategory: string) {
  sendEvent({
    _e: 'course_view',
    
    // Course information
    course_slug: courseSlug,
    course_title: courseTitle,
    course_category: courseCategory,
    
    // User preferences (for personalization context)
    goal: 'explore-for-fun',
    role: 'ux-designer',
    daily_goal_minutes: 15,
    
    // Page context
    url: typeof window !== 'undefined' ? window.location.href : '',
  });
}

/**
 * Example 4: Course Enrollment Event
 */
export function sendCourseEnrollEvent(courseSlug: string, courseTitle: string) {
  sendEvent({
    _e: 'course_enroll',
    
    // Course information
    course_slug: courseSlug,
    course_title: courseTitle,
    
    // User preferences
    goal: 'explore-for-fun',
    role: 'ux-designer',
    education: 'bachelor-s-degree',
    
    // Enrollment details
    enrollment_date: new Date().toISOString(),
  });
}

/**
 * Example 5: Course Completion Event
 */
export function sendCourseCompleteEvent(courseSlug: string, courseTitle: string) {
  sendEvent({
    _e: 'course_complete',
    
    // Course information
    course_slug: courseSlug,
    course_title: courseTitle,
    
    // User preferences
    goal: 'explore-for-fun',
    role: 'ux-designer',
    daily_goal_minutes: 15,
    
    // Completion details
    completed_at: new Date().toISOString(),
    completion_percentage: 100,
  });
}

/**
 * Example 6: Direct jstag.send() usage (if you need it)
 * Note: Use sendEvent() wrapper instead - it handles SDK readiness
 */
export function directJstagSendExample() {
  if (typeof window === 'undefined' || !window.jstag) {
    console.warn('jstag not available');
    return;
  }

  // Direct usage (not recommended - use sendEvent() instead)
  window.jstag.send({
    _e: 'identify',
    email: 'akshayadk@student.tce.edu',
    user_id: '2057a6d5-b179-4cab-a2bb-4246e2747edc',
    goal: 'explore-for-fun',
    role: 'ux-designer',
    // ... other fields
  });
}


/**
 * Lytics Integration Utilities
 * 
 * This module provides functions to interact with the Lytics JavaScript tag (jstag)
 * for tracking user events and building user profiles for personalization.
 */

// Extend Window interface to include jstag
declare global {
  interface Window {
    jstag: {
      send: (data: Record<string, unknown>) => void;
      mock?: boolean;
      _q?: Array<{ method: string; args: unknown[] }>;
    };
  }
}

// ============================================
// Lytics Ready Check
// ============================================

/**
 * Check if Lytics jstag is ready and loaded
 */
export function isLyticsReady(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.jstag !== 'undefined' && 
         typeof window.jstag.send === 'function';
}

/**
 * Wait for Lytics to be ready, then execute callback
 */
export function onLyticsReady(callback: () => void, maxWait = 5000): void {
  if (typeof window === 'undefined') return;
  
  if (isLyticsReady()) {
    callback();
    return;
  }
  
  const startTime = Date.now();
  const checkInterval = setInterval(() => {
    if (isLyticsReady()) {
      clearInterval(checkInterval);
      callback();
    } else if (Date.now() - startTime > maxWait) {
      clearInterval(checkInterval);
      console.warn('[Lytics] Timeout waiting for jstag to load');
    }
  }, 100);
}

// ============================================
// Core Tracking Functions
// ============================================

/**
 * Send any event to Lytics
 */
export function sendEvent(eventData: Record<string, unknown>): void {
  const eventType = eventData._e || 'unknown';
  
  if (!isLyticsReady()) {
    console.warn(`[Lytics] ⏳ jstag not ready, queuing ${eventType} event...`);
    console.table(eventData);
    // Queue the event to be sent when ready
    onLyticsReady(() => {
      window.jstag.send(eventData);
      console.log(`[Lytics] ✅ Queued ${eventType} event SENT to Lytics!`);
      console.table(eventData);
    });
    return;
  }
  
  window.jstag.send(eventData);
  console.log(`[Lytics] ✅ ${eventType} event SENT to Lytics!`);
  console.table(eventData);
}

/**
 * Identify user with profile data
 * This syncs user data from your application to Lytics user profile
 */
export function identifyUser(userData: {
  email: string;
  user_id?: string;
  full_name?: string;
  // Preference fields from onboarding
  goal?: string | null;
  role?: string | null;
  education?: string | null;
  topics?: string[];
  schedule?: string | null;
  daily_goal_minutes?: number | null;
  // Enrollment data
  courses_enrolled?: string[];
  courses_completed?: string[];
}): void {
  const eventData: Record<string, unknown> = {
    _e: 'identify',
    email: userData.email,
  };

  // Add optional fields if they exist
  if (userData.user_id) eventData.user_id = userData.user_id;
  if (userData.full_name) eventData.full_name = userData.full_name;
  if (userData.goal) eventData.goal = userData.goal;
  if (userData.role) eventData.role = userData.role;
  if (userData.education) eventData.education = userData.education;
  if (userData.topics && userData.topics.length > 0) eventData.topics = userData.topics;
  if (userData.schedule) eventData.schedule = userData.schedule;
  if (userData.daily_goal_minutes) eventData.daily_goal_minutes = userData.daily_goal_minutes;
  if (userData.courses_enrolled && userData.courses_enrolled.length > 0) {
    eventData.courses_enrolled = userData.courses_enrolled;
  }
  if (userData.courses_completed && userData.courses_completed.length > 0) {
    eventData.courses_completed = userData.courses_completed;
  }

  sendEvent(eventData);
}

/**
 * Track page view
 */
export function trackPageView(pagePath?: string, pageTitle?: string): void {
  sendEvent({
    _e: 'pageview',
    url: pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
    title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
  });
}

// ============================================
// Course & Learning Event Tracking
// ============================================

/**
 * Track when a user views a course detail page
 */
export function trackCourseView(courseData: {
  course_slug: string;
  course_title?: string;
  course_category?: string;
  instructor_name?: string;
}): void {
  sendEvent({
    _e: 'course_view',
    course_slug: courseData.course_slug,
    course_title: courseData.course_title,
    course_category: courseData.course_category,
    instructor_name: courseData.instructor_name,
  });
}

/**
 * Track when a user enrolls in a course
 */
export function trackCourseEnroll(courseData: {
  course_slug: string;
  course_title?: string;
  course_category?: string;
}): void {
  sendEvent({
    _e: 'course_enroll',
    course_slug: courseData.course_slug,
    course_title: courseData.course_title,
    course_category: courseData.course_category,
    action: 'enroll',
  });
}

/**
 * Track when a user completes a lesson
 */
export function trackLessonComplete(lessonData: {
  lesson_uid: string;
  lesson_title?: string;
  course_slug: string;
  module_title?: string;
}): void {
  sendEvent({
    _e: 'lesson_complete',
    lesson_uid: lessonData.lesson_uid,
    lesson_title: lessonData.lesson_title,
    course_slug: lessonData.course_slug,
    module_title: lessonData.module_title,
    action: 'complete',
  });
}

/**
 * Track when a user completes a course
 */
export function trackCourseComplete(courseData: {
  course_slug: string;
  course_title?: string;
  course_category?: string;
}): void {
  sendEvent({
    _e: 'course_complete',
    course_slug: courseData.course_slug,
    course_title: courseData.course_title,
    course_category: courseData.course_category,
    action: 'complete',
  });
}

/**
 * Track when a user clicks on a category
 */
export function trackCategoryClick(categoryData: {
  category_slug: string;
  category_name?: string;
}): void {
  sendEvent({
    _e: 'category_click',
    category_slug: categoryData.category_slug,
    category_name: categoryData.category_name,
  });
}

/**
 * Track search queries
 */
export function trackSearch(searchData: {
  query: string;
  results_count?: number;
}): void {
  sendEvent({
    _e: 'search',
    search_query: searchData.query,
    results_count: searchData.results_count,
  });
}

// ============================================
// Lytics Script Configuration
// ============================================

/**
 * Get the Lytics account ID from environment
 */
export function getLyticsAccountId(): string {
  return process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID || '';
}

/**
 * DEBUG: Send a test event with ALL fields to verify Lytics connection
 * Call this from browser console: window.testLytics()
 */
export function sendTestEvent(): void {
  const testData = {
    _e: 'identify',
    email: 'test-user@stackacademy.com',
    user_id: 'test-user-001',
    full_name: 'Test User',
    // User preferences from onboarding
    goal: 'change-career',
    role: 'software-developer',
    education: 'bachelors-degree',
    topics: ['programming', 'web-development', 'data-science'],
    schedule: '30',
    daily_goal_minutes: 30,
    // Course data
    courses_enrolled: ['react-basics', 'python-fundamentals'],
    courses_completed: ['html-css-basics'],
    courses_viewed: ['react-basics', 'python-fundamentals', 'machine-learning'],
    course_category: 'programming',
    course_slug: 'react-basics',
  };
  
  console.log('🧪 [Lytics TEST] Sending test event with ALL fields...');
  sendEvent(testData);
  
  // Also send a course view event
  setTimeout(() => {
    console.log('🧪 [Lytics TEST] Sending course_view event...');
    sendEvent({
      _e: 'course_view',
      course_slug: 'test-course',
      course_title: 'Test Course',
      course_category: 'programming',
    });
  }, 1000);
  
  // Also send a pageview event
  setTimeout(() => {
    console.log('🧪 [Lytics TEST] Sending pageview event...');
    sendEvent({
      _e: 'pageview',
      url: '/test-page',
      title: 'Test Page',
    });
  }, 2000);
}

// Make test function available globally in browser
if (typeof window !== 'undefined') {
  (window as unknown as { testLytics: typeof sendTestEvent }).testLytics = sendTestEvent;
}

/**
 * Generate the Lytics JavaScript tag script content
 */
export function getLyticsScriptContent(accountId: string): string {
  return `
    !function(){"use strict";var o=window.jstag||(window.jstag={}),r=[];function n(e){o[e]=function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];r.push([e,t])}}n("send"),n("mock"),n("identify"),n("pageView"),n("unblock"),n("getid"),n("setid"),n("loadEntity"),n("getEntity"),n("on"),n("once"),n("call"),o.loadScript=function(n,t,i){var e=document.createElement("script");e.async=!0,e.src=n,e.onload=t,e.onerror=i;var o=document.getElementsByTagName("script")[0],r=o&&o.parentNode||document.head||document.body,c=o||r.lastChild;return null!=c?r.insertBefore(e,c):r.appendChild(e),this},o.init=function n(t){return this.config=t,this.loadScript("https://c.lytics.io/api/tag/"+t.cid+"/latest.min.js",function(){o.init(o.config),function(n){for(var t=0;t<n.length;t++)o[n[t][0]].apply(o,n[t][1])}(r),r=[]}),this},o.init({cid:"${accountId}",loadid:!0,pageAnalysis:{dataLayerPull:{disabled:!1}}})}();
  `;
}


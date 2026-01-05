/**
 * Lytics Integration Utilities
 * 
 * This module provides functions to interact with the Lytics JavaScript tag (jstag)
 * for tracking user events and building user profiles for personalization.
 */

// Extend Window interface to include jstag
// Based on Lytics JavaScript Tag API: https://docs.lytics.com/docs/lytics-javascript-tag#installation
declare global {
  interface Window {
    jstag: {
      send: (data: Record<string, unknown>) => void;
      identify?: (data: Record<string, unknown>) => void;
      getEntity?: (callback: (error: any, entity: any) => void) => void;
      getSegments?: (callback: (segments: string[]) => void) => void;
      pageView?: () => void;
      init?: (config: { src: string }) => void;
      once?: (event: string, callback: () => void) => void;
      on?: (event: string, callback: () => void) => void;
      isLoaded?: boolean;
      mock?: boolean;
      _q?: Array<{ method: string; args: unknown[] }>;
      config?: Record<string, unknown>;
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
 * Store audiences in localStorage
 * Key format: lytics_audiences_{userIdentifier}
 */
export function storeAudiencesInLocalStorage(userIdentifier: string, audiences: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `lytics_audiences_${userIdentifier}`;
    const data = {
      audiences,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
    console.log('[Lytics] 💾 Stored audiences in localStorage:', { key, audiences });
  } catch (error) {
    console.warn('[Lytics] Failed to store audiences in localStorage:', error);
  }
}

/**
 * Get audiences from localStorage
 * Returns null if not found or if data is stale (older than 1 hour)
 */
export function getAudiencesFromLocalStorage(userIdentifier: string): string[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `lytics_audiences_${userIdentifier}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const isStale = Date.now() - data.timestamp > oneHour;
    
    if (isStale) {
      console.log('[Lytics] ⏰ Stored audiences are stale, will refresh from Lytics');
      localStorage.removeItem(key);
      return null;
    }
    
    console.log('[Lytics] 📦 Retrieved audiences from localStorage:', data.audiences);
    return Array.isArray(data.audiences) ? data.audiences : null;
  } catch (error) {
    console.warn('[Lytics] Failed to get audiences from localStorage:', error);
    return null;
  }
}

/**
 * Clear audiences from localStorage
 */
export function clearAudiencesFromLocalStorage(userIdentifier: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `lytics_audiences_${userIdentifier}`;
    localStorage.removeItem(key);
    console.log('[Lytics] 🗑️ Cleared audiences from localStorage:', key);
  } catch (error) {
    console.warn('[Lytics] Failed to clear audiences from localStorage:', error);
  }
}

/**
 * Get audiences from Lytics and store in localStorage
 * This should be called after identifyUser() to cache audiences
 */
export function fetchAndStoreAudiences(userIdentifier: string): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.jstag) {
      console.log('[Lytics] jstag not available for fetching audiences');
      resolve([]);
      return;
    }

    // Wait a bit for Lytics to process the identify call
    setTimeout(() => {
      // Try jstag.getSegments() first (recommended)
      if (typeof window.jstag.getSegments === 'function') {
        window.jstag.getSegments((segments: string[]) => {
          const audiences = Array.isArray(segments) ? segments : [];
          if (audiences.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiences);
          }
          console.log('[Lytics] 📊 Fetched and stored audiences:', audiences);
          resolve(audiences);
        });
        return;
      }

      // Fallback to getEntity()
      if (typeof (window.jstag as any).getEntity === 'function') {
        (window.jstag as any).getEntity((error: any, entity: any) => {
          if (error) {
            console.warn('[Lytics] Error getting entity:', error);
            resolve([]);
            return;
          }

          const audiences = entity?.data?.audiences || 
                          entity?.data?.segments || 
                          entity?.audiences || 
                          [];
          const audiencesArray = Array.isArray(audiences) ? audiences : [];
          
          if (audiencesArray.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiencesArray);
          }
          console.log('[Lytics] 📊 Fetched and stored audiences from entity:', audiencesArray);
          resolve(audiencesArray);
        });
      } else {
        resolve([]);
      }
    }, 1000); // Wait 1 second for Lytics to process
  });
}

/**
 * Identify user with profile data
 * This syncs user data from your application to Lytics user profile
 * Field names match Lytics audience definition expectations
 * After identifying, fetches and stores audiences in localStorage
 * 
 * Uses jstag.identify() directly (more reliable than send()) and jstag.once("ready")
 * to ensure SDK is ready before calling identify.
 */
export function identifyUser(userData: {
  email: string;
  user_id?: string;
  full_name?: string;
  // Preference fields from onboarding (mapped to Lytics field names)
  goal?: string | null;           // Maps to career_intent in Lytics
  role?: string | null;           // Maps to job_role in Lytics
  education?: string | null;      // Maps to education_background in Lytics
  topics?: string[];
  schedule?: string | null;
  daily_goal_minutes?: number | null;  // Maps to minutes_per_day_target in Lytics
  // Enrollment data
  courses_enrolled?: string[];
  courses_completed?: string[];   // Maps to completed_course_slugs in Lytics
  categories_explored?: string[]; // Categories user has explored
}): void {
  if (typeof window === 'undefined' || !window.jstag) {
    console.warn('[Lytics] jstag not available, cannot identify user');
    return;
  }

  // Build identify payload with all user data
  // Map to Lytics field names that match audience definitions
  const identifyPayload: Record<string, unknown> = {
    email: userData.email,
    identified_at: new Date().toISOString(),
  };

  // Add optional fields if they exist
  if (userData.user_id) identifyPayload.user_id = userData.user_id;
  if (userData.full_name) identifyPayload.name = userData.full_name;
  
  // Map to Lytics field names that match audience definitions
  if (userData.goal) {
    identifyPayload.goal = userData.goal;  // Keep original for backwards compatibility
    identifyPayload.career_intent = userData.goal;  // Lytics audience field name
  }
  if (userData.role) {
    identifyPayload.role = userData.role;  // Keep original
    identifyPayload.job_role = userData.role;  // Lytics audience field name
  }
  if (userData.education) {
    identifyPayload.education = userData.education;  // Keep original
    identifyPayload.education_background = userData.education;  // Lytics audience field name
  }
  if (userData.topics && userData.topics.length > 0) identifyPayload.topics = userData.topics;
  if (userData.schedule) identifyPayload.schedule = userData.schedule;
  if (userData.daily_goal_minutes) {
    identifyPayload.daily_goal_minutes = userData.daily_goal_minutes;  // Keep original
    identifyPayload.minutes_per_day_target = userData.daily_goal_minutes;  // Lytics audience field name
  }
  if (userData.courses_enrolled && userData.courses_enrolled.length > 0) {
    identifyPayload.courses_enrolled = userData.courses_enrolled;
  }
  if (userData.courses_completed && userData.courses_completed.length > 0) {
    identifyPayload.courses_completed = userData.courses_completed;
    identifyPayload.completed_course_slugs = userData.courses_completed;  // Lytics audience field name
  }
  if (userData.categories_explored && userData.categories_explored.length > 0) {
    identifyPayload.categories_explored = userData.categories_explored;  // Lytics audience field name
  }

  // Helper function to call identify
  const callIdentify = () => {
    if (window.jstag?.identify) {
      window.jstag.identify(identifyPayload);
      console.log('[Lytics] ✅ User identified:', {
        email: userData.email,
        user_id: userData.user_id,
        hasPreferences: !!(userData.goal || userData.role),
      });
      
      // After identifying, we need to wait longer for Lytics to:
      // 1. Process the identify call
      // 2. Evaluate audience rules
      // 3. Update the user profile
      // 4. Set the segments cookie
      // This can take 2-5 seconds depending on Lytics processing time
      const userIdentifier = userData.user_id || userData.email || 'anonymous';
      
      // Try multiple times with increasing delays to get segments
      // Lytics needs time to evaluate audience rules and update cookies
      const checkSegments = (attempt: number, maxAttempts: number = 5) => {
        setTimeout(() => {
          // First, try to trigger a page view to ensure Lytics processes the data
          if (attempt === 1 && window.jstag?.pageView) {
            window.jstag.pageView();
            console.log('[Lytics] 📄 Triggered pageView to refresh segments');
          }
          
          // Try to get segments
          if (typeof window.jstag.getSegments === 'function') {
            window.jstag.getSegments((segments: string[]) => {
              const audiences = Array.isArray(segments) ? segments : [];
              
              // Check if we got real segments (not just ["all"])
              const hasRealSegments = audiences.length > 0 && 
                                     !(audiences.length === 1 && audiences[0] === 'all');
              
              if (hasRealSegments) {
                console.log('[Lytics] ✅ Got real segments:', audiences);
                storeAudiencesInLocalStorage(userIdentifier, audiences);
              } else if (attempt < maxAttempts) {
                // If still ["all"], wait longer and try again
                console.log(`[Lytics] ⏳ Segments still ["all"], retrying (attempt ${attempt + 1}/${maxAttempts})...`);
                checkSegments(attempt + 1, maxAttempts);
              } else {
                console.warn('[Lytics] ⚠️ Segments still ["all"] after all attempts. This might mean:');
                console.warn('  1. Audience rules in Lytics are not matching this user');
                console.warn('  2. Lytics needs more time to process (check Lytics dashboard)');
                console.warn('  3. Audience rules need to be configured correctly');
              }
            });
          } else {
            // Fallback to getEntity
            fetchAndStoreAudiences(userIdentifier).catch((error) => {
              console.warn('[Lytics] Failed to fetch and store audiences:', error);
            });
          }
        }, attempt * 2000); // 2s, 4s, 6s, 8s, 10s delays
      };
      
      // Start checking segments after initial delay
      checkSegments(1);
    } else {
      console.warn('[Lytics] jstag.identify() is not available');
    }
  };

  // Use once() to wait for SDK ready, or call directly if already loaded
  if (window.jstag.once) {
    window.jstag.once("ready", () => {
      callIdentify();
    });
  }

  // Also try direct identify in case SDK is already loaded
  // This ensures we don't miss the call if SDK is already ready
  if (isLyticsReady() && window.jstag.identify) {
    callIdentify();
  }
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

/**
 * Force Lytics to refresh segments by triggering a page view
 * This can help ensure segments are evaluated and cookies are updated
 */
export function refreshLyticsSegments(): void {
  if (typeof window === 'undefined' || !window.jstag) {
    console.warn('[Lytics] Cannot refresh segments - jstag not available');
    return;
  }
  
  // Trigger a page view to force Lytics to re-evaluate segments
  if (window.jstag.pageView) {
    window.jstag.pageView();
    console.log('[Lytics] 🔄 Triggered pageView to refresh segments');
  }
  
  // Also try to get segments after a short delay
  setTimeout(() => {
    if (typeof window.jstag.getSegments === 'function') {
      window.jstag.getSegments((segments: string[]) => {
        const audiences = Array.isArray(segments) ? segments : [];
        console.log('[Lytics] 📊 Current segments after refresh:', audiences);
        
        // Check if segments are still ["all"]
        if (audiences.length === 1 && audiences[0] === 'all') {
          console.warn('[Lytics] ⚠️ Segments still ["all"]. Possible issues:');
          console.warn('  1. Audience rules in Lytics dashboard may not match user attributes');
          console.warn('  2. Lytics needs more time to process (check Lytics dashboard)');
          console.warn('  3. User attributes may not match audience criteria');
          console.warn('  4. Lytics integration in Contentstack Personalize may need configuration');
        }
      });
    }
  }, 2000);
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

// Global functions are defined at the end of the file

/**
 * Generate the Lytics JavaScript tag script content
 * Uses the EXACT official Lytics JStag Version 3 format from documentation
 * Reference: https://docs.lytics.com/docs/lytics-javascript-tag#installation
 */
export function getLyticsScriptContent(accountId: string): string {
  // EXACT official Lytics snippet from documentation - DO NOT MODIFY
  return `<!-- Start Lytics Tracking Tag Version 3 -->
  !function(){"use strict";var o=window.jstag||(window.jstag={}),r=[];function n(e){o[e]=function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];r.push([e,t])}}n("send"),n("mock"),n("identify"),n("pageView"),n("unblock"),n("getid"),n("setid"),n("loadEntity"),n("getEntity"),n("on"),n("once"),n("call"),o.loadScript=function(n,t,i){var e=document.createElement("script");e.async=!0,e.src=n,e.onload=t,e.onerror=i;var o=document.getElementsByTagName("script")[0],r=o&&o.parentNode||document.head||document.body,c=o||r.lastChild;return null!=c?r.insertBefore(e,c):r.appendChild(e),this},o.init=function n(t){return this.config=t,this.loadScript(t.src,function(){if(o.init===n)throw new Error("Load error!");o.init(o.config),function(){for(var n=0;n<r.length;n++){var t=r[n][0],i=r[n][1];o[t].apply(o,i)}r=void 0}()}),this}}();
  // Define config and initialize Lytics tracking tag.
  // - The setup below will disable the automatic sending of Page Analysis Information (to prevent duplicative sends, as this same information will be included in the jstag.pageView() call below, by default)
  jstag.init({
    src: 'https://c.lytics.io/api/tag/${accountId}/latest.min.js'
  });
  
  // You may need to send a page view, depending on your use-case
  jstag.pageView();
  console.log("[Lytics] 📡 Initialized with account: ${accountId.substring(0, 8)}...");`;
}

/**
 * DEBUG: Check Lytics connection status and cookies
 * Call from browser console: window.checkLytics()
 */
export function checkLyticsStatus(): void {
  console.log('=== LYTICS DEBUG INFO ===');
  console.log('1. Account ID:', getLyticsAccountId() || 'NOT SET ❌');
  console.log('2. jstag exists:', typeof window !== 'undefined' && typeof window.jstag !== 'undefined' ? 'YES ✅' : 'NO ❌');
  
  if (typeof window !== 'undefined' && window.jstag) {
    console.log('3. jstag.send exists:', typeof window.jstag.send === 'function' ? 'YES ✅' : 'NO ❌');
    console.log('4. jstag config:', window.jstag.config || 'Not available');
  }
  
  // Check if script element exists
  const scriptExists = typeof document !== 'undefined' && document.querySelector('script[data-lytics]');
  console.log('5. Lytics script tag in DOM:', scriptExists ? 'YES ✅' : 'NO ❌');
  
  // Check for Lytics external script
  const externalScripts = typeof document !== 'undefined' 
    ? Array.from(document.querySelectorAll('script')).filter(s => s.src?.includes('lytics.io'))
    : [];
  console.log('6. External Lytics scripts loaded:', externalScripts.length > 0 ? `YES (${externalScripts.length}) ✅` : 'NO ❌');
  
  if (externalScripts.length > 0) {
    externalScripts.forEach((s, i) => console.log(`   Script ${i + 1}:`, s.src));
  }
  
  // Check Lytics cookies - Check ALL cookies (including domain-specific ones)
  if (typeof document !== 'undefined') {
    // Get all cookies (including those from different domains/paths)
    const allCookies = document.cookie.split(';').map(c => c.trim());
    const seeridCookies = allCookies.filter(c => c.startsWith('seerid='));
    const segmentsCookies = allCookies.filter(c => c.startsWith('lytics_segments='));
    
    console.log('7. seerid cookies found:', seeridCookies.length);
    if (seeridCookies.length > 1) {
      console.warn('   ⚠️ Multiple seerid cookies detected! This might cause issues.');
      seeridCookies.forEach((cookie, index) => {
        const value = cookie.split('=')[1];
        console.log(`   seerid ${index + 1}: ${value.substring(0, 20)}...`);
      });
      console.warn('   💡 This usually happens when:');
      console.warn('      - Cookies are set on different domains (localhost vs .lytics.io)');
      console.warn('      - Multiple Lytics instances are running');
      console.warn('      - Cookie domain configuration mismatch');
    } else if (seeridCookies.length === 1) {
      const value = seeridCookies[0].split('=')[1];
      console.log('   ✅ seerid cookie:', `${value.substring(0, 20)}...`);
    } else {
      console.log('   ❌ No seerid cookie found');
    }
    
    console.log('8. lytics_segments cookies found:', segmentsCookies.length);
    if (segmentsCookies.length > 0) {
      segmentsCookies.forEach((cookie, index) => {
        const value = cookie.split('=')[1];
        console.log(`   lytics_segments ${index + 1}: ${value}`);
      });
    } else {
      console.log('   ❌ No lytics_segments cookie found');
    }
    
    // Check cookie details using document.cookie API
    // Note: document.cookie only shows cookies for current domain
    // Cookies from other domains won't be visible here
    console.log('9. All cookies for current domain (localhost):', document.cookie);
    
    // Try to get segments from jstag
    if (window.jstag && typeof window.jstag.getSegments === 'function') {
      window.jstag.getSegments((segments: string[]) => {
        console.log('9. Segments from jstag.getSegments():', segments);
        if (segments && segments.length > 0 && !(segments.length === 1 && segments[0] === 'all')) {
          console.log('   ✅ Real segments found!');
        } else {
          console.log('   ⚠️ Segments still ["all"] - Lytics has not evaluated user yet');
        }
      });
    } else {
      console.log('9. jstag.getSegments() not available');
    }
  }
  
  console.log('=========================');
  console.log('💡 About seerid cookie:');
  console.log('   - Set automatically by Lytics SDK when it loads');
  console.log('   - Contains Lytics user ID (UUID)');
  console.log('   - Used to identify user across sessions');
  console.log('   - Personalize SDK reads this to query Lytics for segments');
  console.log('   - Format: seerid=a8655926-a013-4a3d-9fd6-7bb62471472e');
  console.log('');
  console.log('💡 About lytics_segments cookie:');
  console.log('   - Set by Lytics after audience evaluation');
  console.log('   - Contains array of segment names user belongs to');
  console.log('   - Format: ["Intensive Learners", "Career Transitioners"]');
  console.log('   - Default: ["all"] if segments not evaluated yet');
  console.log('=========================');
}

// Make debug function available globally
if (typeof window !== 'undefined') {
  (window as unknown as { testLytics: typeof sendTestEvent; checkLytics: typeof checkLyticsStatus }).testLytics = sendTestEvent;
  (window as unknown as { testLytics: typeof sendTestEvent; checkLytics: typeof checkLyticsStatus }).checkLytics = checkLyticsStatus;
}


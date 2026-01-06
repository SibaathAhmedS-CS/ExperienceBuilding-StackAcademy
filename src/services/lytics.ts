/**
 * Lytics Service Layer
 * Based on reference implementation pattern
 */

let sessionStartTime = Date.now();
let isSessionTracking = false;

const waitForLytics = (callback: () => void, maxAttempts = 50): void => {
  let attempts = 0;
  const check = () => {
    attempts++;
    if (typeof window !== 'undefined' && (typeof window.jstag !== 'undefined' || typeof window.lio !== 'undefined')) {
      if (attempts > 1) {
        console.log(`[Lytics Service] ✅ Lytics detected after ${attempts} attempts`);
      }
      callback();
    } else if (attempts < maxAttempts) {
      if (attempts === 1) {
        console.log('[Lytics Service] ⏳ Waiting for Lytics to load...');
      }
      setTimeout(check, 100);
    } else {
      console.warn('[Lytics Service] ⚠️ Lytics not detected after max attempts');
    }
  };
  check();
};

const sendToLytics = (data: Record<string, unknown>): void => {
  waitForLytics(() => {
    try {
      // Log the event data before sending
      console.log('[Lytics Service] 📤 Preparing to send event:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Event Type:', data._e || 'unknown');
      console.log('Full Data:', JSON.stringify(data, null, 2));
      console.log('Timestamp:', new Date().toISOString());
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send(data);
        console.log('[Lytics Service] ✅ Event sent via jstag.send()');
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('track', data._e || 'event', data);
        console.log('[Lytics Service] ✅ Event sent via lio()');
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error sending event:', error);
    }
  });
};

export const identifyUser = (
  userData: {
    email: string;
    id?: string;
    _id?: string;
    name?: string;
    createdAt?: string;
  },
  options: {
    waitForAudienceProcessing?: boolean;
    onSegmentsReady?: (segments: string[]) => void;
    preferences?: {
      goal?: string | null;
      role?: string | null;
      education?: string | null;
      topics?: string[] | null;
      schedule?: string | null;
      daily_goal_minutes?: number | null;
      [key: string]: unknown;
    };
    attributes?: Record<string, unknown>;
  } = {}
): void => {
  if (!userData) return;

  const { 
    waitForAudienceProcessing = false, 
    onSegmentsReady,
    preferences,
    attributes 
  } = options;

  const identifyData: Record<string, unknown> = {
    _e: 'identify',
    email: userData.email,
    user_id: userData.id || userData._id,
    name: userData.name,
    first_name: userData.name?.split(' ')[0],
    last_name: userData.name?.split(' ').slice(1).join(' '),
    created_at: userData.createdAt,
  };

  // Add preferences if provided
  if (preferences) {
    // Map preferences to Lytics-friendly field names
    if (preferences.goal) {
      identifyData.goal = preferences.goal;
      identifyData.career_intent = preferences.goal; // Also map to career_intent for audience matching
    }
    if (preferences.role) {
      identifyData.role = preferences.role;
      identifyData.job_role = preferences.role; // Also map to job_role for audience matching
    }
    if (preferences.education) {
      identifyData.education = preferences.education;
      identifyData.education_background = preferences.education; // Also map to education_background
    }
    if (preferences.topics && Array.isArray(preferences.topics)) {
      identifyData.topics = preferences.topics;
    }
    if (preferences.schedule) {
      identifyData.schedule = preferences.schedule;
    }
    if (preferences.daily_goal_minutes !== null && preferences.daily_goal_minutes !== undefined) {
      identifyData.daily_goal_minutes = preferences.daily_goal_minutes;
      identifyData.minutes_per_day_target = preferences.daily_goal_minutes; // Also map to minutes_per_day_target
    }
    
    // Include any additional preference fields
    Object.keys(preferences).forEach(key => {
      if (!['goal', 'role', 'education', 'topics', 'schedule', 'daily_goal_minutes'].includes(key)) {
        identifyData[key] = preferences[key];
      }
    });
  }

  // Add any additional attributes
  if (attributes) {
    Object.assign(identifyData, attributes);
  }

  // Remove undefined values
  Object.keys(identifyData).forEach(key => {
    if (identifyData[key] === undefined || identifyData[key] === null) {
      delete identifyData[key];
    }
  });

  waitForLytics(() => {
    try {
      console.log('[Lytics Service] 👤 Identifying user:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Identify Data:', JSON.stringify(identifyData, null, 2));
      console.log('Has Preferences:', !!preferences);
      if (preferences) {
        console.log('Preferences being sent:', JSON.stringify(preferences, null, 2));
      }
      console.log('Wait for audience processing:', waitForAudienceProcessing);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send(identifyData);
        console.log('[Lytics Service] ✅ User identified via jstag.send()');
        console.log('[Lytics Service] ⏳ Audience processing will begin shortly...');
        
        // If waiting for audience processing, set up listener
        if (waitForAudienceProcessing || onSegmentsReady) {
          const startTime = Date.now();
          const maxWaitTime = 10000; // 10 seconds
          
          // Listen for segment updates
          const unsubscribe = onSegmentsUpdate((segments) => {
            if (segments.length > 0) {
              console.log('[Lytics Service] ✅ Audience processing complete!');
              console.log('[Lytics Service] ⏱️ Processing time:', Date.now() - startTime, 'ms');
              console.log('[Lytics Service] 📋 Segments:', JSON.stringify(segments, null, 2));
              
              if (onSegmentsReady) {
                onSegmentsReady(segments);
              }
              
              unsubscribe();
            }
          });
          
          // Also check cookie periodically as fallback
          let checkCount = 0;
          const maxChecks = 50; // 10 seconds at 200ms intervals
          const checkInterval = setInterval(() => {
            checkCount++;
            const segments = getSegmentsFromCookie();
            
            if (segments.length > 0) {
              console.log('[Lytics Service] ✅ Audience processing complete (via cookie check)!');
              console.log('[Lytics Service] ⏱️ Processing time:', Date.now() - startTime, 'ms');
              console.log('[Lytics Service] 📋 Segments:', JSON.stringify(segments, null, 2));
              
              if (onSegmentsReady) {
                onSegmentsReady(segments);
              }
              
              clearInterval(checkInterval);
              unsubscribe();
            } else if (checkCount >= maxChecks) {
              console.warn('[Lytics Service] ⚠️ Timeout waiting for audience processing');
              clearInterval(checkInterval);
              unsubscribe();
            }
          }, 200);
        }
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('identify', identifyData);
        console.log('[Lytics Service] ✅ User identified via lio()');
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error identifying user:', error);
    }
  });
};

export const clearUser = (): void => {
  waitForLytics(() => {
    try {
      console.log('[Lytics Service] 🚪 Clearing user session (logout)');
      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send({ _e: 'logout' });
        console.log('[Lytics Service] ✅ Logout event sent');
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error clearing user:', error);
    }
  });
};

export const trackPageView = (pageName: string, properties: Record<string, unknown> = {}): void => {
  sendToLytics({
    _e: 'page_view',
    page_name: pageName,
    url: typeof window !== 'undefined' ? window.location.href : '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    title: typeof document !== 'undefined' ? document.title : '',
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackEvent = (eventName: string, properties: Record<string, unknown> = {}): void => {
  sendToLytics({
    _e: eventName,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...properties
  });
};

export const trackClick = (elementName: string, properties: Record<string, unknown> = {}): void => {
  sendToLytics({
    _e: 'click',
    element: elementName,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...properties
  });
};

export const trackCourseView = (course: {
  slug: string;
  title?: string;
  category?: string;
  instructor_name?: string;
}): void => {
  if (!course || !course.slug) return;

  sendToLytics({
    _e: 'course_view',
    course_slug: course.slug,
    course_title: course.title,
    course_category: course.category,
    instructor_name: course.instructor_name,
    timestamp: new Date().toISOString()
  });
};

export const trackCourseEnroll = (course: {
  slug: string;
  title?: string;
  category?: string;
}): void => {
  if (!course || !course.slug) return;

  sendToLytics({
    _e: 'course_enroll',
    course_slug: course.slug,
    course_title: course.title,
    course_category: course.category,
    timestamp: new Date().toISOString()
  });
};

export const trackSearch = (query: string, resultsCount = 0): void => {
  sendToLytics({
    _e: 'search',
    search_query: query,
    results_count: resultsCount,
    timestamp: new Date().toISOString()
  });
};

export const trackFilter = (filterType: string, filterValue: string): void => {
  sendToLytics({
    _e: 'filter_apply',
    filter_type: filterType,
    filter_value: filterValue,
    timestamp: new Date().toISOString()
  });
};

export const startSessionTracking = (): void => {
  if (isSessionTracking) return;
  
  isSessionTracking = true;
  sessionStartTime = Date.now();

  const handleUnload = () => {
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    
    const data = {
      _e: 'session_end',
      duration_seconds: duration,
      pages_viewed: typeof window !== 'undefined' && window.performance ? (window.performance as any).navigation?.redirectCount || 1 : 1,
      timestamp: new Date().toISOString()
    };

    // navigator.sendBeacon is always defined, so we just check for 'navigator' object availability
    if (typeof navigator !== 'undefined') {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      // Note: Replace with your Lytics account ID if needed
      // Uncomment and configure the line below to send the beacon to Lytics
      // navigator.sendBeacon('https://c.lytics.io/collect/json/YOUR_ACCOUNT_ID', blob);
    } else {
      sendToLytics(data);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  sendToLytics({
    _e: 'session_start',
    timestamp: new Date().toISOString(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    screen_width: typeof window !== 'undefined' ? window.screen.width : 0,
    screen_height: typeof window !== 'undefined' ? window.screen.height : 0,
    viewport_width: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewport_height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
};

export const trackNavigation = (menuItem: string, url: string): void => {
  sendToLytics({
    _e: 'navigation_click',
    menu_item: menuItem,
    destination_url: url,
    timestamp: new Date().toISOString()
  });
};

/**
 * Helper function to read segments from cookie
 */
const getSegmentsFromCookie = (): string[] => {
  if (typeof document === 'undefined') return [];
  
  const lySegsCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('ly_segs='));
  
  if (lySegsCookie) {
    const segments = lySegsCookie.split('=')[1];
    return segments ? segments.split(',').filter(Boolean) : [];
  }
  
  return [];
};

/**
 * Set up event listeners for segment updates
 */
const setupSegmentListeners = (onSegmentsUpdate: (segments: string[]) => void): void => {
  if (typeof window === 'undefined') return;

  waitForLytics(() => {
    try {
      // Listen for segment updates via jstag.on()
      if (window.jstag && typeof window.jstag.on === 'function') {
        // Listen for 'segments' event - fired when segments are updated
        window.jstag.on('segments', (segments: unknown) => {
          const segmentArray = Array.isArray(segments) ? segments : [];
          console.log('[Lytics Service] 🎯 Segments updated via event listener:', JSON.stringify(segmentArray, null, 2));
          onSegmentsUpdate(segmentArray);
        });

        // Listen for 'profile' event - profile updates may include segment changes
        window.jstag.on('profile', () => {
          const segments = getSegmentsFromCookie();
          if (segments.length > 0) {
            console.log('[Lytics Service] 🎯 Profile updated, segments from cookie:', JSON.stringify(segments, null, 2));
            onSegmentsUpdate(segments);
          }
        });

        console.log('[Lytics Service] ✅ Segment event listeners registered');
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error setting up segment listeners:', error);
    }
  });
};

/**
 * Monitor cookie changes for ly_segs
 */
const setupCookieMonitor = (onSegmentsUpdate: (segments: string[]) => void): (() => void) => {
  if (typeof document === 'undefined') return () => {};

  let lastCookieValue = getSegmentsFromCookie().join(',');
  
  const checkCookie = () => {
    const currentSegments = getSegmentsFromCookie();
    const currentCookieValue = currentSegments.join(',');
    
    if (currentCookieValue !== lastCookieValue) {
      console.log('[Lytics Service] 🍪 Cookie changed! Segments updated:', JSON.stringify(currentSegments, null, 2));
      console.log('[Lytics Service] Previous:', lastCookieValue);
      console.log('[Lytics Service] Current:', currentCookieValue);
      lastCookieValue = currentCookieValue;
      onSegmentsUpdate(currentSegments);
    }
  };

  // Check cookie periodically (every 500ms)
  const intervalId = setInterval(checkCookie, 500);

  // Also monitor storage events (for cross-tab updates)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'ly_segs' || e.key === null) {
      checkCookie();
    }
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
    }
  };
};

// Global segment update callbacks
const segmentUpdateCallbacks: Set<(segments: string[]) => void> = new Set();

/**
 * Register a callback to be notified when segments are updated
 */
export const onSegmentsUpdate = (callback: (segments: string[]) => void): (() => void) => {
  segmentUpdateCallbacks.add(callback);
  
  // Return unsubscribe function
  return () => {
    segmentUpdateCallbacks.delete(callback);
  };
};

// Initialize listeners once
let listenersInitialized = false;
const initializeListeners = (): void => {
  if (listenersInitialized || typeof window === 'undefined') return;
  
  const notifyCallbacks = (segments: string[]) => {
    segmentUpdateCallbacks.forEach(callback => {
      try {
        callback(segments);
      } catch (error) {
        console.error('[Lytics Service] ❌ Error in segment update callback:', error);
      }
    });
  };

  setupSegmentListeners(notifyCallbacks);
  setupCookieMonitor(notifyCallbacks);
  
  listenersInitialized = true;
  console.log('[Lytics Service] ✅ Segment listeners initialized');
};

// Initialize listeners when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Wait a bit for Lytics to load before setting up listeners
  setTimeout(initializeListeners, 1000);
}

export const getUserSegments = (options: {
  waitForProcessing?: boolean;
  maxWaitTime?: number;
} = {}): Promise<string[]> => {
  const { waitForProcessing = false, maxWaitTime = 10000 } = options;
  
  return new Promise((resolve) => {
    console.log('[Lytics Service] 📋 Fetching user segments...');
    console.log('[Lytics Service] Options:', { waitForProcessing, maxWaitTime });
    
    if (typeof document === 'undefined') {
      console.log('[Lytics Service] ⚠️ Document not available, returning empty segments');
      resolve([]);
      return;
    }

    // Initialize listeners if not already done
    initializeListeners();

    // First, try to get segments from cookie (fastest)
    const cookieSegments = getSegmentsFromCookie();
    if (cookieSegments.length > 0) {
      console.log('[Lytics Service] ✅ Segments from cookie (immediate):', JSON.stringify(cookieSegments, null, 2));
      resolve(cookieSegments);
      return;
    }

    // If we don't need to wait for processing, try API methods and return
    if (!waitForProcessing) {
      waitForLytics(() => {
        try {
          if (typeof window !== 'undefined' && window.jstag && window.jstag.getSegments) {
            window.jstag.getSegments((segments: string[]) => {
              console.log('[Lytics Service] ✅ Segments from jstag.getSegments():', JSON.stringify(segments || [], null, 2));
              resolve(segments || []);
            });
          } else if (typeof window !== 'undefined' && window.lio) {
            window.lio('get', 'segments', (segments: string[]) => {
              console.log('[Lytics Service] ✅ Segments from lio():', JSON.stringify(segments || [], null, 2));
              resolve(segments || []);
            });
          } else {
            console.warn('[Lytics Service] ⚠️ No method available to get segments');
            resolve([]);
          }
        } catch (error) {
          console.error('[Lytics Service] ❌ Error getting segments:', error);
          resolve([]);
        }
      });

      setTimeout(() => {
        console.warn('[Lytics Service] ⚠️ Timeout waiting for segments, returning empty array');
        resolve([]);
      }, 3000);
      return;
    }

    // Wait for processing: monitor for segment updates
    console.log('[Lytics Service] ⏳ Waiting for audience processing to complete...');
    
    let resolved = false;
    const startTime = Date.now();
    
    const checkSegments = () => {
      const segments = getSegmentsFromCookie();
      
      if (segments.length > 0) {
        if (!resolved) {
          resolved = true;
          console.log('[Lytics Service] ✅ Segments received after processing:', JSON.stringify(segments, null, 2));
          console.log('[Lytics Service] ⏱️ Wait time:', Date.now() - startTime, 'ms');
          resolve(segments);
        }
        return;
      }

      // Check timeout
      if (Date.now() - startTime > maxWaitTime) {
        if (!resolved) {
          resolved = true;
          console.warn('[Lytics Service] ⚠️ Timeout waiting for audience processing');
          console.warn('[Lytics Service] ⏱️ Waited:', maxWaitTime, 'ms');
          
          // Try API methods as fallback
          waitForLytics(() => {
            try {
              if (typeof window !== 'undefined' && window.jstag && window.jstag.getSegments) {
                window.jstag.getSegments((segments: string[]) => {
                  resolve(segments || []);
                });
              } else {
                resolve([]);
              }
            } catch (error) {
              resolve([]);
            }
          });
        }
        return;
      }

      // Continue checking
      setTimeout(checkSegments, 200);
    };

    // Also listen for segment updates via event
    const unsubscribe = onSegmentsUpdate((segments) => {
      if (!resolved && segments.length > 0) {
        resolved = true;
        console.log('[Lytics Service] ✅ Segments received via event listener:', JSON.stringify(segments, null, 2));
        console.log('[Lytics Service] ⏱️ Wait time:', Date.now() - startTime, 'ms');
        unsubscribe();
        resolve(segments);
      }
    });

    // Start checking
    checkSegments();
  });
};

export const getUserProfile = (): Promise<Record<string, unknown>> => {
  return new Promise((resolve) => {
    waitForLytics(() => {
      try {
        if (typeof window !== 'undefined' && window.jstag && typeof window.jstag.getProfile === 'function') {
          const profile = window.jstag.getProfile();
          resolve(profile || {});
        } else if (typeof window !== 'undefined' && window.lio) {
          window.lio('get', 'profile', (profile: Record<string, unknown>) => {
            resolve(profile || {});
          });
        } else {
          resolve({});
        }
      } catch (error) {
        resolve({});
      }
    });

    setTimeout(() => resolve({}), 3000);
  });
};

export const isInSegment = async (segmentSlug: string): Promise<boolean> => {
  const segments = await getUserSegments();
  return segments.includes(segmentSlug);
};

export const getPersonalizationFlags = async (): Promise<{
  segments: string[];
  isHighValueLearner: boolean;
  isActiveLearner: boolean;
  isNewUser: boolean;
  isReturningVisitor: boolean;
  isRegistered: boolean;
  isMobileUser: boolean;
}> => {
  const segments = await getUserSegments();
  
  return {
    segments,
    isHighValueLearner: segments.some(seg => seg.toLowerCase().includes('high') && seg.toLowerCase().includes('value')),
    isActiveLearner: segments.some(seg => seg.toLowerCase().includes('active')),
    isNewUser: segments.some(seg => seg.toLowerCase().includes('new')),
    isReturningVisitor: segments.some(seg => seg.toLowerCase().includes('returning')),
    isRegistered: segments.some(seg => seg.toLowerCase().includes('registered')),
    isMobileUser: segments.some(seg => seg.toLowerCase().includes('mobile'))
  };
};

const lyticsService = {
  identifyUser,
  clearUser,
  trackPageView,
  trackEvent,
  trackClick,
  trackCourseView,
  trackCourseEnroll,
  trackSearch,
  trackFilter,
  startSessionTracking,
  trackNavigation,
  getUserSegments,
  getUserProfile,
  isInSegment,
  getPersonalizationFlags
};

export default lyticsService;

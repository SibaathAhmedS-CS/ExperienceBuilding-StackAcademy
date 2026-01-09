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
      }
      callback();
    } else if (attempts < maxAttempts) {
      if (attempts === 1) {
      }
      setTimeout(check, 100);
    } else {
    }
  };
  check();
};

const sendToLytics = (data: Record<string, unknown>): void => {
  waitForLytics(() => {
    try {
      // Log the event data before sending

      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send(data);
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('track', data._e || 'event', data);
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
    total_completed_courses?: number;
  } = {}
): void => {
  if (!userData) return;

  const { 
    waitForAudienceProcessing = false, 
    onSegmentsReady,
    preferences,
    attributes,
    total_completed_courses
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

  // Add total_completed_courses if provided
  if (total_completed_courses !== undefined && total_completed_courses !== null) {
    identifyData.total_completed_courses = total_completed_courses;
  }

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
      if (preferences) {
      }

      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send(identifyData);
        
        // If waiting for audience processing, set up listener
        if (waitForAudienceProcessing || onSegmentsReady) {
          const startTime = Date.now();
          const maxWaitTime = 10000; // 10 seconds
          
          // Listen for segment updates
          const unsubscribe = onSegmentsUpdate((segments) => {
            if (segments.length > 0) {
              
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
              
              if (onSegmentsReady) {
                onSegmentsReady(segments);
              }
              
              clearInterval(checkInterval);
              unsubscribe();
            } else if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              unsubscribe();
            }
          }, 200);
        }
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('identify', identifyData);
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error identifying user:', error);
    }
  });
};

export const clearUser = (): void => {
  // Clear the segments cookie immediately
  clearSegmentsCookie();
  
  waitForLytics(() => {
    try {
      const logoutData = { _e: 'logout' };
      
      // Log the event data before sending
      
      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        window.jstag.send(logoutData);
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('track', 'logout', logoutData);
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error clearing user:', error);
    }
  });
};

export const setAnonymousProfile = (): void => {
  // Don't clear cookies here - only send logout event to Lytics
  // Cookies should only be cleared during actual logout (clearUser)
  // This prevents clearing cs-lytics-audiences cookie set by Personalize SDK
  
  waitForLytics(() => {
    try {
      // Use logout event to make user anonymous
      const anonymousData = { 
        _e: 'logout',
      };

      // Log the event data before sending

      if (typeof window !== 'undefined' && window.jstag && window.jstag.send) {
        // Use logout event to reset to anonymous profile
        window.jstag.send(anonymousData);
      } else if (typeof window !== 'undefined' && window.lio) {
        window.lio('track', 'logout', anonymousData);
      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error setting anonymous profile:', error);
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
  
  // Read from cs-lytics-audiences cookie (set by ContentStack Personalize SDK)
  const csAudiencesCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('cs-lytics-audiences='));
  
  if (csAudiencesCookie) {
    try {
      const cookieValue = csAudiencesCookie.split('=')[1];
      
      if (cookieValue) {
        // Handle pipe-delimited format: |segment1|segment2|segment3|
        if (cookieValue.startsWith('|') && cookieValue.endsWith('|')) {
          const segments = cookieValue
            .split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0);
          if (segments.length > 0) {
            return segments;
          }
        }
        
        // Try parsing as JSON first (in case it's an array)
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieValue));
          if (Array.isArray(parsed)) {
            return parsed.filter(Boolean);
          } else if (typeof parsed === 'string') {
            // If it's a string, try pipe-delimited or comma-separated
            if (parsed.includes('|')) {
              return parsed.split('|').map(s => s.trim()).filter(Boolean);
            }
            return parsed.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch {
          // If not JSON, check if it's pipe-delimited or comma-separated
          if (cookieValue.includes('|')) {
            return cookieValue.split('|').map(s => s.trim()).filter(Boolean);
          }
          // Otherwise treat as comma-separated string
          return cookieValue.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } catch (error) {
    }
  }
  
  // Debug: Log all cookies to help diagnose
  if (typeof document !== 'undefined') {
    const allCookies = document.cookie.split('; ').map(c => c.split('=')[0]);
  }
  
  return [];
};

/**
 * Helper function to clear all Lytics-related cookies
 */
const clearSegmentsCookie = (): void => {
  if (typeof document === 'undefined') return;
  
  // List of all Lytics-related cookies to clear
  const cookiesToClear = [
    'seerid',
    'seerses',
    'cs-lytics-audiences',
    'cs-lytics-flows',
    'cs-personalize-manifest',
  ];
  
  // Also clear cookies that start with cs-personalize-user-uid
  const allCookies = document.cookie.split('; ');
  allCookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0];
    if (cookieName.startsWith('cs-personalize-user-uid')) {
      cookiesToClear.push(cookieName);
    }
  });
  
  // Domains to try clearing from
  const domains = ['localhost', window.location.hostname, '.lytics.io', 'lytics.io'];
  const paths = ['/', ''];
  
  // Clear each cookie for each domain/path combination
  cookiesToClear.forEach(cookieName => {
    domains.forEach(domain => {
      paths.forEach(path => {
        // Try without leading dot
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain};`;
        // Try with leading dot (for subdomain cookies)
        if (domain !== 'localhost' && !domain.startsWith('.')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=.${domain};`;
        }
      });
    });
  });
  
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
          onSegmentsUpdate(segmentArray);
        });

        // Listen for 'profile' event - profile updates may include segment changes
        window.jstag.on('profile', () => {
          const segments = getSegmentsFromCookie();
          if (segments.length > 0) {
            onSegmentsUpdate(segments);
          }
        });

      }
    } catch (error) {
      console.error('[Lytics Service] ❌ Error setting up segment listeners:', error);
    }
  });
};

/**
 * Monitor cookie changes for cs-lytics-audiences
 */
const setupCookieMonitor = (onSegmentsUpdate: (segments: string[]) => void): (() => void) => {
  if (typeof document === 'undefined') return () => {};

  let lastCookieValue = getSegmentsFromCookie().join(',');
  
  const checkCookie = () => {
    const currentSegments = getSegmentsFromCookie();
    const currentCookieValue = currentSegments.join(',');
    
    if (currentCookieValue !== lastCookieValue) {
      lastCookieValue = currentCookieValue;
      onSegmentsUpdate(currentSegments);
    }
  };

  // Check cookie periodically (every 500ms)
  const intervalId = setInterval(checkCookie, 500);

  // Also monitor storage events (for cross-tab updates)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'cs-lytics-audiences' || e.key === null) {
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
    
    if (typeof document === 'undefined') {
      resolve([]);
      return;
    }

    // Initialize listeners if not already done
    initializeListeners();

    // First, try to get segments from cookie (fastest)
    const cookieSegments = getSegmentsFromCookie();
    if (cookieSegments.length > 0) {
      resolve(cookieSegments);
      return;
    }

    if (!waitForProcessing) {
      waitForLytics(() => {
        try {
          if (typeof window !== 'undefined' && window.jstag && window.jstag.getSegments) {
            window.jstag.getSegments((segments: string[]) => {
              resolve(segments || []);
            });
          } else if (typeof window !== 'undefined' && window.lio) {
            window.lio('get', 'segments', (segments: string[]) => {
              resolve(segments || []);
            });
          } else {
            resolve([]);
          }
        } catch (error) {
          console.error('[Lytics Service] ❌ Error getting segments:', error);
          resolve([]);
        }
      });

      setTimeout(() => {
        resolve([]);
      }, 3000);
      return;
    }

    // Wait for processing: monitor for segment updates
    
    let resolved = false;
    const startTime = Date.now();
    
    const checkSegments = () => {
      const segments = getSegmentsFromCookie();
      
      if (segments.length > 0) {
        if (!resolved) {
          resolved = true;
          resolve(segments);
        }
        return;
      }

      // Check timeout
      if (Date.now() - startTime > maxWaitTime) {
        if (!resolved) {
          resolved = true;
          
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
  setAnonymousProfile,
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

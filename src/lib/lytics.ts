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
    console.log('📤 TO LYTICS - Event queued (will send when ready):', JSON.stringify(eventData, null, 2));
    // Queue the event to be sent when ready
    onLyticsReady(() => {
      window.jstag.send(eventData);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📤 TO LYTICS - Queued ${eventType} event sent:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(eventData, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    return;
  }
  
  window.jstag.send(eventData);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📤 TO LYTICS - ${eventType} event sent:`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(eventData, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📥 FROM LYTICS - Segments received via getSegments():');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(JSON.stringify(audiences, null, 2));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          if (audiences.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiences);
          }
          resolve(audiences);
        });
        return;
      }

      // Fallback to getEntity()
      if (typeof (window.jstag as any).getEntity === 'function') {
        (window.jstag as any).getEntity((error: any, entity: any) => {
          if (error) {
            console.warn('[Lytics] ❌ Error getting entity:', error);
            resolve([]);
            return;
          }

          const audiences = entity?.data?.audiences || 
                          entity?.data?.segments || 
                          entity?.audiences || 
                          [];
          const audiencesArray = Array.isArray(audiences) ? audiences : [];
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📥 FROM LYTICS - Entity data received via getEntity():');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(JSON.stringify(entity, null, 2));
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('[Lytics] 📥 FROM LYTICS - Audiences extracted:', audiencesArray);
          
          if (audiencesArray.length > 0) {
            storeAudiencesInLocalStorage(userIdentifier, audiencesArray);
          }
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

  // Build identify payload matching the exact structure required
  // Structure: email, identified_at, user_id, name, goal, role, education, topics, daily_goal_minutes
  // IMPORTANT: Always include email and user_id to prevent "anonymous_profiles" segment
  const identifyPayload: Record<string, unknown> = {
    email: userData.email,
    identified_at: new Date().toISOString(),
  };

  // CRITICAL: Always include user_id to identify the user (prevents anonymous_profiles)
  if (userData.user_id) {
    identifyPayload.user_id = userData.user_id;
  } else if (userData.email) {
    // Fallback: use email as user_id if user_id not provided
    identifyPayload.user_id = userData.email;
  }
  
  // Add optional fields if they exist (matching exact structure)
  if (userData.full_name) identifyPayload.name = userData.full_name;
  
  // Add preference fields (original field names only - no mapped fields)
  if (userData.goal) {
    identifyPayload.goal = userData.goal;
  }
  if (userData.role) {
    identifyPayload.role = userData.role;
  }
  if (userData.education) {
    identifyPayload.education = userData.education;
  }
  if (userData.topics && userData.topics.length > 0) {
    identifyPayload.topics = userData.topics;
  }
  if (userData.daily_goal_minutes) {
    // Ensure daily_goal_minutes is always a number
    const minutes = typeof userData.daily_goal_minutes === 'string' 
      ? parseInt(userData.daily_goal_minutes, 10) 
      : userData.daily_goal_minutes;
    if (!isNaN(minutes as number)) {
      identifyPayload.daily_goal_minutes = minutes;
    }
  }
  
  // Note: schedule field is NOT included in the payload (removed per requirements)
  // schedule is stored in database but not sent to Lytics
  
  // Optional: Add enrollment data if provided (not in your example but keeping for flexibility)
  if (userData.courses_enrolled && userData.courses_enrolled.length > 0) {
    identifyPayload.courses_enrolled = userData.courses_enrolled;
  }
  if (userData.courses_completed && userData.courses_completed.length > 0) {
    identifyPayload.courses_completed = userData.courses_completed;
  }
  if (userData.categories_explored && userData.categories_explored.length > 0) {
    identifyPayload.categories_explored = userData.categories_explored;
  }

  // TO LYTICS: Log the complete payload being sent
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📤 TO LYTICS - Data being sent to Lytics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(JSON.stringify(identifyPayload, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Also log field breakdown for quick reference
  console.log('[Lytics] 📤 TO LYTICS - Field summary:', {
    email: identifyPayload.email,
    user_id: identifyPayload.user_id,
    name: identifyPayload.name,
    goal: identifyPayload.goal,
    role: identifyPayload.role,
    education: identifyPayload.education,
    topics_count: Array.isArray(identifyPayload.topics) ? identifyPayload.topics.length : 0,
    daily_goal_minutes: identifyPayload.daily_goal_minutes,
  });

  // Prevent duplicate identify calls for the same user
  const userIdentifier = userData.user_id || userData.email || 'anonymous';
  const identifyKey = `lytics_identify_${userIdentifier}`;
  
  // Store user ownership for cookie validation
  if (userData.user_id && typeof window !== 'undefined') {
    storeLyticsUserOwnership(userData.user_id);
  }
  
  // Check if we're already identifying this user
  if (typeof window !== 'undefined') {
    const isIdentifying = (window as any)[identifyKey];
    if (isIdentifying) {
      console.log('[Lytics] ⏭️ [DEBUG] Already identifying user, skipping duplicate call');
      return;
    }
    // Mark as identifying
    (window as any)[identifyKey] = true;
  }

  // Helper function to call identify
  const callIdentify = () => {
    // CHANGED: Try both identify() and send() methods for better compatibility
    let identifyMethodUsed = 'none';
    
    // Method 1: Try jstag.identify() first
    if (window.jstag?.identify) {
      try {
      window.jstag.identify(identifyPayload);
        identifyMethodUsed = 'identify()';
        console.log('[Lytics] ✅ Called jstag.identify() - Data sent to Lytics above');
      } catch (error) {
        console.error('[Lytics] ❌ Error calling jstag.identify():', error);
      }
    }
    
    if (identifyMethodUsed === 'none') {
      console.warn('[Lytics] ⚠️ Neither jstag.identify() nor jstag.send() is available');
      // Clear identifying flag
      if (typeof window !== 'undefined') {
        (window as any)[identifyKey] = false;
      }
      return;
    }
    
    console.log('[Lytics] ✅ [DEBUG] User identification sent via:', identifyMethodUsed);
    console.log('[Lytics] ✅ [DEBUG] User identified:', {
        email: userData.email,
        user_id: userData.user_id,
        hasPreferences: !!(userData.goal || userData.role),
      method: identifyMethodUsed,
    });
    
    // After identifying, we need to wait longer for Lytics to:
    // 1. Process the identify call
    // 2. Evaluate audience rules
    // 3. Update the user profile
    // 4. Set the segments cookie
    // This can take 2-5 seconds depending on Lytics processing time
    
    // CHANGED: Increased max attempts and delays for better reliability
    const checkSegments = (attempt: number, maxAttempts: number = 8) => {
      setTimeout(() => {
        console.log(`[Lytics] 🔍 [DEBUG] Checking segments - Attempt ${attempt}/${maxAttempts}`);
        
        // CHANGED: Trigger pageview on each attempt to force re-evaluation
        if (window.jstag?.pageView) {
          window.jstag.pageView();
          console.log(`[Lytics] 📄 [DEBUG] Triggered pageView (attempt ${attempt}) to refresh segments`);
        }
        
        // Also check cookies on each attempt to see if they're being updated
        const cookieAudiences = getLyticsAudiencesFromCookies();
        if (cookieAudiences.length > 0) {
          console.log(`[Lytics] 🍪 [DEBUG] Cookies updated - Found ${cookieAudiences.length} segments in cookies:`, cookieAudiences);
          const hasUIExplorers = cookieAudiences.some(seg => 
            seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
          );
          if (hasUIExplorers) {
            console.log('[Lytics] ✅ Found "ui explorers" in cookies!');
          }
        }
        
          // Try to get segments
          if (typeof window.jstag.getSegments === 'function') {
            console.log(`[Lytics] 🔍 [DEBUG] Calling jstag.getSegments() - Attempt ${attempt}/${maxAttempts}`);
            window.jstag.getSegments((segments: string[]) => {
              const audiences = Array.isArray(segments) ? segments : [];
              
              // FROM LYTICS: Log segments received from Lytics
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log(`📥 FROM LYTICS - Attempt ${attempt}/${maxAttempts} - Segments received from jstag.getSegments():`);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log(JSON.stringify(audiences, null, 2));
              console.log(`[Lytics] 📥 FROM LYTICS - Segments type:`, typeof audiences, 'Length:', audiences.length);
              console.log(`[Lytics] 📥 FROM LYTICS - Raw segments value:`, segments);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              // Check if we got real segments (not just ["all"] or ["all", "smt_new"])
              const managedSegmentsOnly = audiences.length <= 2 && 
                                         audiences.every(seg => ['all', 'smt_new', 'anonymous_profiles'].includes(seg));
              const hasRealSegments = audiences.length > 0 && !managedSegmentsOnly;
              
              if (hasRealSegments) {
                // Clear identifying flag on success
                if (typeof window !== 'undefined') {
                  (window as any)[identifyKey] = false;
                }
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ ✅ ✅ SUCCESS! Real segments received from Lytics:');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(JSON.stringify(audiences, null, 2));
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('[Lytics] ✅ Storing segments in localStorage');
                storeAudiencesInLocalStorage(userIdentifier, audiences);
                
                // Check if "ui explorers" is in the segments
                const hasUIExplorers = audiences.some(seg => 
                  seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
                );
                if (hasUIExplorers) {
                  console.log('[Lytics] ✅ "ui explorers" segment found in getSegments()!');
                  console.log('[Lytics] 💡 If cookie is not updating, try:');
                  console.log('   1. Wait 5-10 seconds for Lytics to update cookies');
                  console.log('   2. Call window.refreshLyticsSegments()');
                  console.log('   3. Refresh the page');
                } else {
                  console.log('[Lytics] ⚠️ "ui explorers" NOT found in segments');
                  console.log('[Lytics] 💡 Available segments:', audiences);
                  console.log('[Lytics] 💡 Check Lytics Dashboard → Audiences → "UI explorers"');
                  console.log('[Lytics] 💡 Verify segment name matches exactly (case-sensitive)');
                }
              } else {
              // DEBUG: Log why segments are still only managed segments
              if (attempt === 1) {
                console.log('[Lytics] 🔍 [DEBUG] First attempt - Segments are:', audiences);
                console.log('[Lytics] 🔍 [DEBUG] Only managed segments found - Lytics needs time to evaluate custom audiences');
                console.log('[Lytics] 🔍 [DEBUG] Payload that was sent:', identifyPayload);
                console.log('[Lytics] 🔍 [DEBUG] Fields being checked by Contentstack Personalize:');
                console.log('   - goal should equal "explore-for-fun"');
                console.log('   - role should equal "ux-designer"');
                console.log('   - Current values:', {
                  goal: identifyPayload.goal,
                  role: identifyPayload.role,
                  education: identifyPayload.education,
                  topics: identifyPayload.topics,
                });
              }
              
              if (attempt < maxAttempts) {
                console.log(`[Lytics] ⏳ [DEBUG] Segments still only managed segments:`, audiences);
                console.log(`[Lytics] ⏳ [DEBUG] Retrying in ${(attempt + 1) * 3000}ms (attempt ${attempt + 1}/${maxAttempts})...`);
                checkSegments(attempt + 1, maxAttempts);
    } else {
                // Clear identifying flag on failure
                if (typeof window !== 'undefined') {
                  (window as any)[identifyKey] = false;
                }
                console.error('[Lytics] ❌ ❌ ❌ FAILED: Only managed segments after all attempts:', audiences);
                console.error('[Lytics] 🔍 [DEBUG] Final debugging information:');
                console.error('   📤 Payload sent:', JSON.stringify(identifyPayload, null, 2));
                console.error('   📊 Final segments:', audiences);
                console.error('   ⏰ Total wait time:', maxAttempts * 3000, 'ms');
                console.error('');
                console.error('[Lytics] 🔍 [DEBUG] Troubleshooting steps:');
                console.error('   1. Check Lytics Dashboard → User Profiles → Search by email:', userData.email);
                console.error('   2. Verify user attributes match Contentstack Personalize audience rules:');
                console.error('      - goal should be: "explore-for-fun"');
                console.error('      - role should be: "ux-designer"');
                console.error('   3. Check Audiences → Edit Audience → Rules in Lytics');
                console.error('   4. Verify field names match exactly:', {
                  goal: identifyPayload.goal,
                  role: identifyPayload.role,
                  education: identifyPayload.education,
                });
                console.error('   5. Ensure audiences are Published (not Draft) in Lytics');
                console.error('   6. Check Network tab → c.lytics.io/c → Payload section');
                console.error('   7. If user exists in Lytics but cookie not updating:');
                console.error('      - Wait 10-15 seconds after identify() call');
                console.error('      - Call window.refreshLyticsSegments()');
                console.error('      - Check cs-lytics-audiences cookie (set by Personalize SDK)');
                
                // Try getEntity as last resort
                if (typeof window.jstag.getEntity === 'function') {
                  console.log('[Lytics] 🔍 Trying getEntity() as last resort...');
                  window.jstag.getEntity((error: any, entity: any) => {
                    if (error) {
                      console.error('[Lytics] ❌ getEntity() error:', error);
                    } else {
                      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                      console.log('📥 FROM LYTICS - Entity data received from Lytics:');
                      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                      console.log(JSON.stringify(entity, null, 2));
                      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                      const entityAudiences = entity?.data?.audiences || entity?.audiences || [];
                      console.log('[Lytics] 📥 FROM LYTICS - Entity audiences:', entityAudiences);
                      
                      // Check user attributes in entity
                      console.log('[Lytics] 🔍 User attributes in Lytics:', {
                        goal: entity?.data?.goal || entity?.goal,
                        role: entity?.data?.role || entity?.role,
                        email: entity?.data?.email || entity?.email,
                      });
                    }
                  });
                }
              }
            }
          });
        } else {
          console.warn('[Lytics] ⚠️ [DEBUG] jstag.getSegments() is not available, trying getEntity() fallback');
          // Fallback to getEntity
          fetchAndStoreAudiences(userIdentifier).catch((error) => {
            console.warn('[Lytics] ❌ [DEBUG] Failed to fetch and store audiences:', error);
          });
        }
      }, attempt * 3000); // CHANGED: Increased to 3s, 6s, 9s, 12s, 15s, 18s, 21s, 24s delays
    };
    
    // Start checking segments after initial delay
    console.log('[Lytics] 🔍 [DEBUG] Starting segment check process...');
    checkSegments(1);
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
  
  // Clear identifying flag after 30 seconds as safety measure
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      (window as any)[identifyKey] = false;
    }, 30000);
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
  
  // Also try to get segments after a delay
  setTimeout(() => {
    if (window.jstag && typeof window.jstag.getSegments === 'function') {
      window.jstag.getSegments((segments: string[]) => {
        console.log('[Lytics] 📥 Segments after refresh:', segments);
        const cookieAudiences = getLyticsAudiencesFromCookies();
        console.log('[Lytics] 📥 Audiences from cookies after refresh:', cookieAudiences);
      });
    }
  }, 2000);
}

/**
 * Deep diagnostic - checks everything to find why segments aren't appearing
 * Call from browser console: window.diagnoseSegmentIssue()
 */
export function diagnoseSegmentIssue(): void {
  console.log('=== DEEP DIAGNOSTIC: WHY SEGMENTS AREN\'T APPEARING ===');
  
  if (!window.jstag) {
    console.error('❌ jstag not available');
    return;
  }
  
  // 1. Check what Lytics returns
  if (typeof window.jstag.getSegments === 'function') {
    window.jstag.getSegments((segments: string[]) => {
      const lyticsSegments = Array.isArray(segments) ? segments : [];
      console.log('1. Lytics segments (jstag.getSegments()):', lyticsSegments);
      
      // 2. Check what's in Personalize cookie
      const cookieAudiences = getLyticsAudiencesFromCookies();
      console.log('2. Personalize cookie (cs-lytics-audiences):', cookieAudiences);
      
      // 3. Check user entity/attributes
      if (typeof window.jstag.getEntity === 'function') {
        window.jstag.getEntity((error: any, entity: any) => {
          if (error) {
            console.error('3. Error getting entity:', error);
          } else {
            console.log('3. User entity from Lytics:', entity);
            const userGoal = entity?.data?.goal || entity?.goal;
            const userRole = entity?.data?.role || entity?.role;
            const userEmail = entity?.data?.email || entity?.email;
            
            console.log('');
            console.log('4. User attributes:');
            console.log('   email:', userEmail);
            console.log('   goal:', userGoal);
            console.log('   role:', userRole);
            console.log('');
            console.log('5. Contentstack Personalize "UI explorers" requires:');
            console.log('   ✅ goal = "explore-for-fun"', userGoal === 'explore-for-fun' ? '✅ MATCH' : `❌ MISMATCH (got: "${userGoal}")`);
            console.log('   ✅ role = "ux-designer"', userRole === 'ux-designer' ? '✅ MATCH' : `❌ MISMATCH (got: "${userRole}")`);
            
            if (userGoal !== 'explore-for-fun' || userRole !== 'ux-designer') {
              console.log('');
              console.log('❌ ❌ ❌ ROOT CAUSE FOUND!');
              console.log('   User attributes do NOT match "UI explorers" audience rules!');
              console.log('');
              console.log('   🔧 Solution:');
              console.log('      1. Update user profile with correct values:');
              console.log('         - goal should be: "explore-for-fun"');
              console.log('         - role should be: "ux-designer"');
              console.log('      2. Call identifyUser() again with correct values');
              console.log('      3. Wait 10-15 seconds for Lytics to re-evaluate');
              return;
            }
          }
          
          // 4. Check if segments match
          console.log('');
          console.log('6. Segment comparison:');
          const hasOnlyAll = lyticsSegments.length === 1 && lyticsSegments[0] === 'all';
          
          if (hasOnlyAll) {
            console.log('   ⚠️ Lytics still returning ["all"] - evaluation not complete');
            console.log('   💡 Possible reasons:');
            console.log('      1. Lytics needs more time (can take 30-60 seconds)');
            console.log('      2. User attributes don\'t match (but we checked above)');
            console.log('      3. Audience is not Published in Lytics');
            console.log('      4. Audience rules are incorrect');
            console.log('');
            console.log('   🔧 Next steps:');
            console.log('      1. Check Lytics Dashboard → Audiences → "UI explorers"');
            console.log('         - Verify it\'s Published (not Draft)');
            console.log('         - Check Rules tab - verify field names match');
            console.log('      2. Check Lytics Dashboard → User Profiles → Search by email');
            console.log('         - Verify user attributes are stored correctly');
            console.log('      3. Wait 30-60 seconds and call this function again');
          } else {
            console.log('   ✅ Lytics has real segments:', lyticsSegments);
            const missingInCookie = lyticsSegments.filter(seg => !cookieAudiences.includes(seg));
            if (missingInCookie.length > 0) {
              console.log('   ⚠️ Segments missing in Personalize cookie:', missingInCookie);
              console.log('   💡 This is a timing issue - Personalize SDK read too early');
              console.log('   🔧 Solution: Refresh the page to force Personalize SDK to re-read');
            } else {
              console.log('   ✅ Segments match between Lytics and Personalize cookie');
            }
          }
          
          // 5. Check for "ui explorers" specifically
          console.log('');
          console.log('7. "ui explorers" segment check:');
          const uiExplorerVariations = lyticsSegments.filter(seg => 
            seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
          );
          const hasInCookie = cookieAudiences.some(seg => 
            seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
          );
          
          console.log('   In Lytics:', uiExplorerVariations.length > 0 ? `YES ✅ (${uiExplorerVariations.join(', ')})` : 'NO ❌');
          console.log('   In Personalize cookie:', hasInCookie ? 'YES ✅' : 'NO ❌');
          
          if (uiExplorerVariations.length === 0) {
            console.log('');
            console.log('   ❌ "ui explorers" NOT found in Lytics segments');
            console.log('   💡 Available segments:', lyticsSegments);
            console.log('   💡 Check Lytics Dashboard → Audiences → "UI explorers"');
            console.log('   💡 Verify segment name matches exactly (case-sensitive)');
            console.log('   💡 Common variations: "ui-explorer", "UI Explorers", "ui_explorers"');
          }
        });
      } else {
        console.error('❌ jstag.getEntity() not available');
      }
    });
  } else {
    console.error('❌ jstag.getSegments() not available');
  }
}

/**
 * Wait for Lytics to finish evaluating segments, then force Personalize SDK to refresh
 * This solves the issue where Personalize SDK reads segments before Lytics finishes evaluation
 * Call from browser console: window.waitForLyticsAndRefreshPersonalize()
 */
export function waitForLyticsAndRefreshPersonalize(maxWaitSeconds: number = 60): void {
  if (typeof window === 'undefined' || !window.jstag) {
    console.warn('[Lytics] Cannot wait for segments - jstag not available');
    return;
  }
  
  console.log(`[Lytics] ⏳ Waiting for Lytics to finish evaluating segments (max ${maxWaitSeconds}s)...`);
  console.log('[Lytics] 💡 This will check segments every 2 seconds until real segments appear');
  console.log('[Lytics] 💡 Once segments are ready, it will refresh the page to force Personalize SDK to re-read');
  console.log('[Lytics] 💡 If segments never appear, call window.diagnoseSegmentIssue() to find the root cause');
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  const checkInterval = 2000; // Check every 2 seconds
  
  const checkSegments = (attempt: number) => {
    const elapsed = Date.now() - startTime;
    
    if (elapsed > maxWaitMs) {
      console.error(`[Lytics] ❌ Timeout after ${maxWaitSeconds}s - segments still not ready`);
      console.error('[Lytics] 💡 Call window.diagnoseSegmentIssue() to find the root cause');
      console.error('[Lytics] 💡 Common issues:');
      console.error('   1. User attributes don\'t match audience rules');
      console.error('   2. Audience is not Published in Lytics');
      console.error('   3. Segment name doesn\'t match exactly');
      return;
    }
    
    // Trigger pageView to force Lytics to re-evaluate
    if (window.jstag?.pageView) {
      window.jstag.pageView();
    }
    
    // Check segments
    if (typeof window.jstag.getSegments === 'function') {
      window.jstag.getSegments((segments: string[]) => {
        const audiences = Array.isArray(segments) ? segments : [];
        const hasRealSegments = audiences.length > 0 && 
                               !(audiences.length === 1 && audiences[0] === 'all');
        
        console.log(`[Lytics] 🔍 Attempt ${attempt} (${Math.round(elapsed / 1000)}s elapsed):`, audiences);
        
        if (hasRealSegments) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ ✅ ✅ SUCCESS! Real segments found:', audiences);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // Check if "ui explorers" is in the segments
          const hasUIExplorers = audiences.some(seg => 
            seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
          );
          
          if (hasUIExplorers) {
            console.log('[Lytics] ✅ "ui explorers" segment found!');
          } else {
            console.log('[Lytics] ⚠️ "ui explorers" NOT found in segments');
            console.log('[Lytics] 💡 Available segments:', audiences);
            console.log('[Lytics] 💡 Call window.diagnoseSegmentIssue() to find why');
            console.log('[Lytics] 💡 Will still refresh page to update Personalize cookie');
          }
          
          console.log('');
          console.log('[Lytics] 🔄 Refreshing page in 2 seconds to force Personalize SDK to re-read segments...');
          console.log('[Lytics] 💡 Personalize SDK will read updated segments from Lytics and update cs-lytics-audiences cookie');
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Continue checking
          setTimeout(() => {
            checkSegments(attempt + 1);
          }, checkInterval);
        }
      });
    } else {
      console.warn('[Lytics] ⚠️ jstag.getSegments() not available');
      setTimeout(() => {
        checkSegments(attempt + 1);
      }, checkInterval);
    }
  };
  
  // Start checking
  checkSegments(1);
}

/**
 * Compare Lytics segments with Personalize cookie to find mismatches
 * Call from browser console: window.compareLyticsAndPersonalize()
 */
export function compareLyticsAndPersonalize(): void {
  console.log('=== COMPARING LYTICS SEGMENTS vs PERSONALIZE COOKIE ===');
  
  // Get segments from Lytics
  if (window.jstag && typeof window.jstag.getSegments === 'function') {
    window.jstag.getSegments((segments: string[]) => {
      const lyticsSegments = Array.isArray(segments) ? segments : [];
      const cookieAudiences = getLyticsAudiencesFromCookies();
      
      console.log('1. Segments from Lytics (jstag.getSegments()):', lyticsSegments);
      console.log('   Type:', typeof lyticsSegments, 'Length:', lyticsSegments.length);
      console.log('2. Segments from Personalize cookie (cs-lytics-audiences):', cookieAudiences);
      console.log('   Type:', typeof cookieAudiences, 'Length:', cookieAudiences.length);
      console.log('');
      
      // Check if Lytics still only has ["all"]
      const hasOnlyAll = lyticsSegments.length === 1 && lyticsSegments[0] === 'all';
      if (hasOnlyAll) {
        console.log('⚠️ ⚠️ ⚠️ LYTICS STILL EVALUATING!');
        console.log('   Lytics segments are still ["all"] - evaluation not complete yet');
        console.log('');
        console.log('   💡 This means Lytics hasn\'t finished evaluating the user');
        console.log('   💡 Possible reasons:');
        console.log('      1. User attributes don\'t match audience rules');
        console.log('      2. Audience is not Published in Lytics');
        console.log('      3. Audience rules are incorrect');
        console.log('      4. Lytics needs more time (can take 30-60 seconds)');
        console.log('');
        console.log('   🔧 Next steps:');
        console.log('      1. Check Lytics Dashboard → User Profiles → Search by email');
        console.log('      2. Verify user attributes match audience rules');
        console.log('      3. Check Lytics Dashboard → Audiences → "UI explorers" → Rules');
        console.log('      4. Verify audience is Published (not Draft)');
        console.log('      5. Wait longer and call this function again');
        return;
      }
      
      // Find segments in Lytics but not in cookie
      const missingInCookie = lyticsSegments.filter(seg => !cookieAudiences.includes(seg));
      if (missingInCookie.length > 0) {
        console.log('⚠️ ⚠️ ⚠️ MISMATCH DETECTED!');
        console.log('   Segments in Lytics but NOT in Personalize cookie:', missingInCookie);
        console.log('');
        console.log('   💡 This means:');
        console.log('      - Lytics has finished evaluating the user');
        console.log('      - But Personalize SDK read segments too early (before evaluation)');
        console.log('      - Personalize SDK cached the old segments in cs-lytics-audiences cookie');
        console.log('');
        console.log('   🔧 Solution:');
        console.log('      1. Call window.waitForLyticsAndRefreshPersonalize()');
        console.log('         This will wait for segments, then refresh page');
        console.log('      2. Or manually refresh the page after Lytics finishes evaluation');
        console.log('      3. Personalize SDK will re-read segments and update cookie');
      } else {
        console.log('✅ Segments match! Both Lytics and Personalize cookie have the same segments');
      }
      
      // Find segments in cookie but not in Lytics (shouldn't happen, but check anyway)
      const extraInCookie = cookieAudiences.filter(seg => !lyticsSegments.includes(seg));
      if (extraInCookie.length > 0) {
        console.log('⚠️ Segments in Personalize cookie but NOT in Lytics:', extraInCookie);
        console.log('   💡 This might indicate stale cookie data');
      }
      
          // Check specifically for "ui explorers" (case-insensitive, flexible matching)
          // Note: Contentstack Personalize slug is "ui_explorers" (with underscore)
          const uiExplorerVariations = lyticsSegments.filter(seg => {
            const segLower = seg.toLowerCase();
            return (segLower.includes('ui') && segLower.includes('explorer')) ||
                   segLower === 'ui_explorers' ||
                   segLower === 'ui-explorers' ||
                   segLower === 'ui explorers';
          });
          const hasUIExplorersInCookie = cookieAudiences.some(seg => {
            const segLower = seg.toLowerCase();
            return (segLower.includes('ui') && segLower.includes('explorer')) ||
                   segLower === 'ui_explorers' ||
                   segLower === 'ui-explorers' ||
                   segLower === 'ui explorers';
          });
          
          console.log('');
          console.log('3. "ui explorers" segment check (checking for: ui_explorers, ui-explorers, ui explorers):');
          console.log('   In Lytics:', uiExplorerVariations.length > 0 ? `YES ✅ (${uiExplorerVariations.join(', ')})` : 'NO ❌');
          console.log('   In Personalize cookie:', hasUIExplorersInCookie ? 'YES ✅' : 'NO ❌');
          
          // Check what the actual segment name is
          const actualSegmentInLytics = uiExplorerVariations.length > 0 ? uiExplorerVariations[0] : null;
          const actualSegmentInCookie = cookieAudiences.find(seg => {
            const segLower = seg.toLowerCase();
            return (segLower.includes('ui') && segLower.includes('explorer')) ||
                   segLower === 'ui_explorers' ||
                   segLower === 'ui-explorers' ||
                   segLower === 'ui explorers';
          });
          
          if (actualSegmentInLytics) {
            console.log('   Actual segment name in Lytics:', actualSegmentInLytics);
          }
          if (actualSegmentInCookie) {
            console.log('   Actual segment name in cookie:', actualSegmentInCookie);
          }
          
          if (uiExplorerVariations.length > 0 && !hasUIExplorersInCookie) {
            console.log('');
            console.log('   ⚠️ "ui explorers" exists in Lytics but NOT in Personalize cookie!');
            console.log('   💡 Found variations:', uiExplorerVariations);
            console.log('   💡 This confirms the timing issue - Personalize SDK read too early');
            console.log('   💡 Contentstack Personalize slug is "ui_explorers" (with underscore)');
            console.log('   🔧 Call window.waitForLyticsAndRefreshPersonalize() to fix');
          } else if (uiExplorerVariations.length === 0) {
            console.log('');
            console.log('   ❌ "ui explorers" NOT found in Lytics segments');
            console.log('   💡 Available segments:', lyticsSegments);
            console.log('   💡 Contentstack Personalize slug is "ui_explorers" (with underscore)');
            console.log('   💡 Check Lytics Dashboard → Audiences → "UI explorers"');
            console.log('   💡 Verify:');
            console.log('      1. Audience is Published (not Draft)');
            console.log('      2. User attributes match audience rules');
            console.log('      3. Segment name in Lytics matches "ui_explorers"');
          } else if (actualSegmentInLytics && actualSegmentInCookie && actualSegmentInLytics !== actualSegmentInCookie) {
            console.log('');
            console.log('   ⚠️ Segment name mismatch!');
            console.log('   💡 Lytics has:', actualSegmentInLytics);
            console.log('   💡 Cookie has:', actualSegmentInCookie);
            console.log('   💡 This might cause issues - names should match');
          }
      
      // Also check user entity to see what attributes Lytics has
      if (window.jstag && typeof window.jstag.getEntity === 'function') {
        window.jstag.getEntity((error: any, entity: any) => {
          if (!error && entity) {
            console.log('');
            console.log('4. User attributes in Lytics:');
            const userGoal = entity?.data?.goal || entity?.goal;
            const userRole = entity?.data?.role || entity?.role;
            console.log('   goal:', userGoal);
            console.log('   role:', userRole);
            console.log('');
            console.log('   Contentstack Personalize "UI explorers" requires:');
            console.log('   ✅ goal = "explore-for-fun"', userGoal === 'explore-for-fun' ? '✅ MATCH' : '❌ MISMATCH');
            console.log('   ✅ role = "ux-designer"', userRole === 'ux-designer' ? '✅ MATCH' : '❌ MISMATCH');
            
            if (userGoal !== 'explore-for-fun' || userRole !== 'ux-designer') {
              console.log('');
              console.log('   ❌ User attributes do NOT match "UI explorers" criteria!');
              console.log('   💡 This is why the segment is not appearing');
              console.log('   💡 Update user profile with correct values');
            }
          }
        });
      }
    });
  } else {
    console.log('❌ jstag.getSegments() not available');
  }
}

/**
 * Check if "ui explorers" segment exists and provide debugging info
 * Call from browser console: window.checkUIExplorers()
 */
export function checkUIExplorersSegment(): void {
  console.log('=== CHECKING "UI EXPLORERS" SEGMENT ===');
  
  // Check from jstag.getSegments()
  if (window.jstag && typeof window.jstag.getSegments === 'function') {
    window.jstag.getSegments((segments: string[]) => {
      console.log('1. Segments from jstag.getSegments():', segments);
      const hasUIExplorers = segments.some(seg => 
        seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer')
      );
      console.log('   Has "ui explorers":', hasUIExplorers ? 'YES ✅' : 'NO ❌');
      
      if (!hasUIExplorers) {
        console.log('   Available segments:', segments);
      }
    });
  } else {
    console.log('1. jstag.getSegments() not available');
  }
  
  // Check from cookies
  const cookieAudiences = getLyticsAudiencesFromCookies();
  console.log('2. Audiences from cookies:', cookieAudiences);
  const hasInCookies = hasLyticsSegment('ui explorers');
  console.log('   Has "ui explorers" in cookies:', hasInCookies ? 'YES ✅' : 'NO ❌');
  
  if (!hasInCookies && cookieAudiences.length > 0) {
    console.log('   Available segments in cookies:', cookieAudiences);
    console.log('   💡 Segment name might be different. Check for variations:');
    cookieAudiences.forEach(seg => {
      if (seg.toLowerCase().includes('ui') || seg.toLowerCase().includes('explorer')) {
        console.log(`      - "${seg}" (might be the one!)`);
      }
    });
  }
  
  // Compare Lytics vs Personalize cookie
  console.log('');
  console.log('3. Comparing Lytics segments vs Personalize cookie:');
  compareLyticsAndPersonalize();
  
  // Check user profile attributes from Lytics
  if (window.jstag && typeof window.jstag.getEntity === 'function') {
    window.jstag.getEntity((error: any, entity: any) => {
      if (!error && entity) {
        console.log('4. User profile from Lytics (getEntity):');
        const userGoal = entity?.data?.goal || entity?.goal;
        const userRole = entity?.data?.role || entity?.role;
        console.log('   goal:', userGoal);
        console.log('   role:', userRole);
        console.log('');
        console.log('   Contentstack Personalize "UI explorers" requires:');
        console.log('   ✅ goal = "explore-for-fun"', userGoal === 'explore-for-fun' ? '✅ MATCH' : '❌ MISMATCH');
        console.log('   ✅ role = "ux-designer"', userRole === 'ux-designer' ? '✅ MATCH' : '❌ MISMATCH');
        
        if (userGoal === 'explore-for-fun' && userRole === 'ux-designer') {
          console.log('');
          console.log('   ✅ User attributes match "UI explorers" criteria!');
          console.log('   💡 If segment still not appearing:');
          console.log('      1. Check Lytics Dashboard → Audiences → "UI explorers"');
          console.log('      2. Verify audience is Published (not Draft)');
          console.log('      3. Check segment name matches exactly');
          console.log('      4. Call window.waitForLyticsAndRefreshPersonalize()');
          console.log('         This will wait for segments, then refresh page');
        } else {
          console.log('');
          console.log('   ❌ User attributes do NOT match "UI explorers" criteria');
          console.log('   💡 Update user profile with correct values:');
          console.log('      - goal should be: "explore-for-fun"');
          console.log('      - role should be: "ux-designer"');
        }
      }
    });
  }
  
  console.log('=========================');
  console.log('💡 If segment is missing:');
  console.log('   1. Call window.compareLyticsAndPersonalize() to see mismatch');
  console.log('   2. Call window.waitForLyticsAndRefreshPersonalize() to fix');
  console.log('   3. Check Lytics Dashboard → Audiences → "ui explorers"');
  console.log('   4. Verify audience is Published');
  console.log('=========================');
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
 * Parse pipe-delimited cookie value (e.g., "|all|smt_new|" -> ["all", "smt_new"])
 */
function parsePipeDelimitedCookie(cookieValue: string): string[] {
  if (!cookieValue) return [];
  // Remove leading/trailing pipes and split by pipe
  return cookieValue
    .replace(/^\|+|\|+$/g, '') // Remove leading/trailing pipes
    .split('|')
    .filter(segment => segment.trim().length > 0); // Filter out empty strings
}

/**
 * Get Lytics audiences from cookies (pipe-delimited format)
 * Checks cs-lytics-audiences (Contentstack Personalize), lytics_audiences, and lytics_segments cookies
 */
export function getLyticsAudiencesFromCookies(): string[] {
  if (typeof document === 'undefined') return [];
  
  const allCookies = document.cookie.split(';').map(c => c.trim());
  
  // Priority 1: Check cs-lytics-audiences cookie (set by Contentstack Personalize SDK)
  // This is the most reliable source as it's set by Personalize after reading Lytics segments
  const csAudiencesCookie = allCookies.find(c => c.startsWith('cs-lytics-audiences='));
  if (csAudiencesCookie) {
    const value = decodeURIComponent(csAudiencesCookie.split('=')[1]);
    const audiences = parsePipeDelimitedCookie(value);
    if (audiences.length > 0) {
      console.log('[Lytics] 📥 Audiences from cs-lytics-audiences cookie (Contentstack Personalize):', audiences);
      return audiences;
    }
  }
  
  // Priority 2: Check lytics_audiences cookie (pipe-delimited format: |all|smt_new|)
  const audiencesCookie = allCookies.find(c => c.startsWith('lytics_audiences='));
  if (audiencesCookie) {
    const value = decodeURIComponent(audiencesCookie.split('=')[1]);
    const audiences = parsePipeDelimitedCookie(value);
    if (audiences.length > 0) {
      console.log('[Lytics] 📥 Audiences from lytics_audiences cookie:', audiences);
      return audiences;
    }
  }
  
  // Priority 3: Check lytics_segments cookie (pipe-delimited format)
  const segmentsCookie = allCookies.find(c => c.startsWith('lytics_segments='));
  if (segmentsCookie) {
    const value = decodeURIComponent(segmentsCookie.split('=')[1]);
    const segments = parsePipeDelimitedCookie(value);
    if (segments.length > 0) {
      console.log('[Lytics] 📥 Segments from lytics_segments cookie:', segments);
      return segments;
    }
  }
  
  return [];
}

/**
 * Check if a specific segment exists in Lytics cookies (case-insensitive, flexible matching)
 * Handles variations like "ui explorers", "ui-explorers", "ui_explorers", "UI Explorers"
 */
export function hasLyticsSegment(segmentName: string): boolean {
  const segments = getLyticsAudiencesFromCookies();
  const normalizedSearch = segmentName.toLowerCase().trim();
  
  // Check for exact match
  const exactMatch = segments.some(seg => seg.toLowerCase().trim() === normalizedSearch);
  if (exactMatch) return true;
  
  // Check for flexible match (handles spaces, hyphens, underscores)
  // e.g., "ui explorers" matches "ui-explorers", "ui_explorers", "UI Explorers"
  const searchParts = normalizedSearch.split(/[\s\-_]+/).filter(p => p.length > 0);
  if (searchParts.length > 0) {
    return segments.some(seg => {
      const segLower = seg.toLowerCase().trim();
      // Check if all parts of the search term are in the segment
      return searchParts.every(part => segLower.includes(part));
    });
  }
  
  return false;
}

/**
 * Get the actual segment name from cookies (handles variations)
 * Returns the actual segment name if found, or null
 */
export function getActualSegmentName(searchName: string): string | null {
  const segments = getLyticsAudiencesFromCookies();
  const normalizedSearch = searchName.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = segments.find(seg => seg.toLowerCase().trim() === normalizedSearch);
  if (exactMatch) return exactMatch;
  
  // Try flexible match
  const searchParts = normalizedSearch.split(/[\s\-_]+/).filter(p => p.length > 0);
  if (searchParts.length > 0) {
    const flexibleMatch = segments.find(seg => {
      const segLower = seg.toLowerCase().trim();
      return searchParts.every(part => segLower.includes(part));
    });
    if (flexibleMatch) return flexibleMatch;
  }
  
  return null;
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
    const audiencesCookies = allCookies.filter(c => c.startsWith('lytics_audiences='));
    const csAudiencesCookies = allCookies.filter(c => c.startsWith('cs-lytics-audiences='));
    const flowsCookies = allCookies.filter(c => c.startsWith('lytics_flows='));
    
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
    
    // Check cs-lytics-audiences cookie (set by Contentstack Personalize SDK)
    console.log('8. cs-lytics-audiences cookies found:', csAudiencesCookies.length);
    if (csAudiencesCookies.length > 0) {
      csAudiencesCookies.forEach((cookie, index) => {
        const value = decodeURIComponent(cookie.split('=')[1]);
        const parsed = parsePipeDelimitedCookie(value);
        console.log(`   cs-lytics-audiences ${index + 1} (raw):`, value);
        console.log(`   cs-lytics-audiences ${index + 1} (parsed):`, parsed);
        console.log(`   cs-lytics-audiences ${index + 1} (count):`, parsed.length, 'segments');
        console.log('   💡 This cookie is set by Contentstack Personalize SDK after reading Lytics segments');
        
        // Check for "ui explorers" segment (case-insensitive)
        const hasUIExplorers = parsed.some(seg => seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer'));
        if (hasUIExplorers) {
          console.log('   ✅ Found "ui explorers" segment in cs-lytics-audiences!');
        } else {
          console.log('   ⚠️ "ui explorers" segment NOT found in cs-lytics-audiences cookie');
          console.log('   💡 Check if segment name matches exactly (case-sensitive):');
          console.log('      - Dashboard shows: "ui explorers"');
          console.log('      - Cookie contains:', parsed);
        }
      });
    } else {
      console.log('   ❌ No cs-lytics-audiences cookie found');
      console.log('   💡 This cookie is set by Contentstack Personalize SDK');
      console.log('   💡 If Personalize SDK is not initialized, this cookie won\'t exist');
    }
    
    // Check lytics_audiences cookie (pipe-delimited format)
    console.log('9. lytics_audiences cookies found:', audiencesCookies.length);
    if (audiencesCookies.length > 0) {
      audiencesCookies.forEach((cookie, index) => {
        const value = decodeURIComponent(cookie.split('=')[1]);
        const parsed = parsePipeDelimitedCookie(value);
        console.log(`   lytics_audiences ${index + 1} (raw):`, value);
        console.log(`   lytics_audiences ${index + 1} (parsed):`, parsed);
        console.log(`   lytics_audiences ${index + 1} (count):`, parsed.length, 'segments');
        
        // Check for "ui explorers" segment (case-insensitive)
        const hasUIExplorers = parsed.some(seg => seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer'));
        if (hasUIExplorers) {
          console.log('   ✅ Found "ui explorers" segment!');
        } else {
          console.log('   ⚠️ "ui explorers" segment NOT found in cookie');
          console.log('   💡 Check if segment name matches exactly (case-sensitive):');
          console.log('      - Dashboard shows: "ui explorers"');
          console.log('      - Cookie contains:', parsed);
        }
      });
    } else {
      console.log('   ❌ No lytics_audiences cookie found');
    }
    
    // Check lytics_flows cookie
    console.log('10. lytics_flows cookies found:', flowsCookies.length);
    if (flowsCookies.length > 0) {
      flowsCookies.forEach((cookie, index) => {
        const value = decodeURIComponent(cookie.split('=')[1]);
        const parsed = parsePipeDelimitedCookie(value);
        console.log(`   lytics_flows ${index + 1} (raw):`, value);
        console.log(`   lytics_flows ${index + 1} (parsed):`, parsed);
      });
    } else {
      console.log('   ❌ No lytics_flows cookie found');
    }
    
    // Check lytics_segments cookie (array format)
    console.log('11. lytics_segments cookies found:', segmentsCookies.length);
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
    console.log('12. All cookies for current domain (localhost):', document.cookie);
    
    // Try to get segments from jstag
    if (window.jstag && typeof window.jstag.getSegments === 'function') {
      window.jstag.getSegments((segments: string[]) => {
        console.log('13. Segments from jstag.getSegments():', segments);
        if (segments && segments.length > 0 && !(segments.length === 1 && segments[0] === 'all')) {
          console.log('   ✅ Real segments found!');
          
          // Check if "ui explorers" is in the segments
          const hasUIExplorers = segments.some(seg => seg.toLowerCase().includes('ui') && seg.toLowerCase().includes('explorer'));
          if (hasUIExplorers) {
            console.log('   ✅ "ui explorers" found in getSegments()!');
          } else {
            console.log('   ⚠️ "ui explorers" NOT found in getSegments()');
            console.log('   💡 Available segments:', segments);
          }
        } else {
          console.log('   ⚠️ Segments still ["all"] - Lytics has not evaluated user yet');
        }
      });
    } else {
      console.log('13. jstag.getSegments() not available');
    }
    
    // Get audiences from cookies using helper function (checks cs-lytics-audiences first)
    const cookieAudiences = getLyticsAudiencesFromCookies();
    console.log('14. Parsed audiences from cookies (priority: cs-lytics-audiences > lytics_audiences > lytics_segments):', cookieAudiences);
    if (cookieAudiences.length > 0) {
      const hasUIExplorers = hasLyticsSegment('ui explorers');
      console.log('15. Has "ui explorers" segment:', hasUIExplorers ? 'YES ✅' : 'NO ❌');
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
  console.log('💡 About cs-lytics-audiences cookie:');
  console.log('   - Set by Contentstack Personalize SDK after reading Lytics segments');
  console.log('   - Contains pipe-delimited segment names: |all|smt_new|ui-explorers|');
  console.log('   - Format: |segment1|segment2|segment3|');
  console.log('   - This is the PRIMARY source for Personalize SDK');
  console.log('   - Only exists if Personalize SDK is initialized');
  console.log('');
  console.log('💡 About lytics_audiences cookie:');
  console.log('   - Set by Lytics after audience evaluation');
  console.log('   - Contains pipe-delimited segment names: |all|smt_new|ui-explorers|');
  console.log('   - Format: |segment1|segment2|segment3|');
  console.log('   - Default: |all| if segments not evaluated yet');
  console.log('');
  console.log('💡 Troubleshooting "ui explorers" not appearing:');
  console.log('   1. Check Lytics Dashboard → Audiences → "ui explorers"');
  console.log('   2. Verify audience is Published (not Draft)');
  console.log('   3. Check audience rules match your user data');
  console.log('   4. Verify exact segment name (case-sensitive):');
  console.log('      - Dashboard: "ui explorers"');
  console.log('      - Cookie might have: "ui-explorers", "UI Explorers", etc.');
  console.log('   5. Wait 5-10 seconds after identify() call for evaluation');
  console.log('   6. Try refreshing page or calling jstag.pageView()');
  console.log('=========================');
}

// ============================================
// Cookie and Storage Management
// ============================================

/**
 * Clear all Lytics-related cookies
 * Called on logout or when user session changes
 * Note: seerid cookie is NOT cleared (for anonymous tracking continuity)
 */
export function clearLyticsCookies(): void {
  if (typeof document === 'undefined') return;
  
  
  // Clear cs-lytics-audiences cookie (set by Personalize SDK)
  document.cookie = 'cs-lytics-audiences=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  

  document.cookie = 'seerid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  document.cookie = 'cs-personalize-manifest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  document.cookie = 'cs-personalize-user-uidt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  document.cookie = 'cs-lytics-flows=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // Note: seerid cookie is NOT cleared (for anonymous tracking continuity)
  // It may be set on .lytics.io domain, so we can't clear it from our domain anyway
  
  console.log('[Lytics] 🗑️ Cleared Lytics cookies (cs-lytics-audiences, lytics_audiences, lytics_segments)');
}

/**
 * Clear all Lytics-related localStorage
 * Called on logout or when user session changes
 */
export function clearLyticsLocalStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all lytics_audiences_* keys
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lytics_audiences_') || 
          key.startsWith('lytics_identify_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear other Lytics-related keys
    localStorage.removeItem('lytics_anonymous_id');
    localStorage.removeItem('lytics_last_user_id'); // Clear user ownership tracking
    
    console.log('[Lytics] 🗑️ Cleared Lytics localStorage');
  } catch (error) {
    console.warn('[Lytics] ⚠️ Error clearing localStorage:', error);
  }
}

/**
 * Clear all Lytics data (cookies + localStorage)
 * Use this on logout
 */
export function clearAllLyticsData(): void {
  clearLyticsCookies();
  clearLyticsLocalStorage();
}

/**
 * Validate if current user matches stored cookie ownership
 * Returns true if cookie is valid for current user, false if stale
 */
export function validateLyticsCookieOwnership(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if we have a stored user_id for the last identified user
    const lastIdentifiedUserId = localStorage.getItem('lytics_last_user_id');
    
    // If no stored user_id, assume cookie is stale (from previous session)
    if (!lastIdentifiedUserId) {
      return false;
    }
    
    // Check if stored user_id matches current user
    return lastIdentifiedUserId === userId;
  } catch (error) {
    console.warn('[Lytics] ⚠️ Error validating cookie ownership:', error);
    return false;
  }
}

/**
 * Store current user_id for cookie ownership validation
 */
export function storeLyticsUserOwnership(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('lytics_last_user_id', userId);
    console.log('[Lytics] 💾 Stored user ownership:', userId);
  } catch (error) {
    console.warn('[Lytics] ⚠️ Error storing user ownership:', error);
  }
}

// Make debug functions available globally
if (typeof window !== 'undefined') {
  const globalFunctions = {
    testLytics: sendTestEvent,
    checkLytics: checkLyticsStatus,
    checkUIExplorers: checkUIExplorersSegment,
    compareLyticsAndPersonalize: compareLyticsAndPersonalize,
    diagnoseSegmentIssue: diagnoseSegmentIssue,
    refreshLyticsSegments: refreshLyticsSegments,
    waitForLyticsAndRefreshPersonalize: waitForLyticsAndRefreshPersonalize,
    getLyticsAudiencesFromCookies: getLyticsAudiencesFromCookies,
    hasLyticsSegment: hasLyticsSegment,
    getActualSegmentName: getActualSegmentName,
  };
  
  Object.assign(window as unknown as typeof globalFunctions, globalFunctions);
  
  // Also import explainSegments if available
  import('./explainSegments').then(module => {
    if (module.explainSegments) {
      (window as any).explainSegments = module.explainSegments;
    }
  }).catch(() => {
    // Ignore if module doesn't exist
  });
}



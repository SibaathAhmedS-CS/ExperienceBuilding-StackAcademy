/**
 * Simplified Lytics integration
 * Direct jstag.send() calls for events
 */

/**
 * Send identify event with user preferences
 */
export function sendIdentifyEvent(userData: {
  email: string;
  user_id?: string;
  full_name?: string | null;
  goal?: string | null;
  role?: string | null;
  education?: string | null;
  schedule?: string | null;
  daily_goal_minutes?: number | null;
  topics?: string[] | null;
}) {
  if (typeof window === 'undefined') return;

  const checkAndSend = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag || typeof jstag.send !== 'function') {
      setTimeout(checkAndSend, 100);
      return;
    }

    try {
      // Build event payload, converting null to undefined for cleaner JSON
      const eventPayload: Record<string, any> = {
        _e: 'identify',
        email: userData.email,
        url: window.location.href,
      };

      // Add optional fields only if they have values (not null/undefined)
      if (userData.user_id) eventPayload.user_id = userData.user_id;
      if (userData.full_name) eventPayload.full_name = userData.full_name;
      if (userData.goal) {
        eventPayload.goal = userData.goal;
        eventPayload.career_intent = userData.goal;
      }
      if (userData.role) {
        eventPayload.role = userData.role;
        eventPayload.job_role = userData.role;
      }
      if (userData.education) {
        eventPayload.education = userData.education;
        eventPayload.education_background = userData.education;
      }
      if (userData.schedule) eventPayload.schedule = userData.schedule;
      if (userData.daily_goal_minutes != null) {
        eventPayload.daily_goal_minutes = userData.daily_goal_minutes;
        eventPayload.minutes_per_day_target = userData.daily_goal_minutes;
      }
      if (userData.topics && userData.topics.length > 0) {
        eventPayload.topics = userData.topics;
      }

      jstag.send(eventPayload);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Identify event sent to Lytics');
      }
    } catch (error) {
      console.error('❌ Error sending identify event:', error);
    }
  };

  checkAndSend();
}

/**
 * Send page view event
 */
export function sendPageView() {
  if (typeof window === 'undefined') return;

  const jstag = (window as any).jstag;
  if (jstag && typeof jstag.pageView === 'function') {
    jstag.pageView();
  }
}


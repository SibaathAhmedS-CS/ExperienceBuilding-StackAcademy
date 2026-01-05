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
  full_name?: string;
  goal?: string;
  role?: string;
  education?: string;
  schedule?: string;
  daily_goal_minutes?: number;
  topics?: string[];
}) {
  if (typeof window === 'undefined') return;

  const checkAndSend = () => {
    const jstag = (window as any).jstag;
    
    if (!jstag || typeof jstag.send !== 'function') {
      setTimeout(checkAndSend, 100);
      return;
    }

    try {
      jstag.send({
        _e: 'identify',
        email: userData.email,
        user_id: userData.user_id,
        full_name: userData.full_name,
        goal: userData.goal,
        role: userData.role,
        education: userData.education,
        schedule: userData.schedule,
        daily_goal_minutes: userData.daily_goal_minutes,
        topics: userData.topics,
        // Mapped Lytics field names
        career_intent: userData.goal,
        job_role: userData.role,
        education_background: userData.education,
        minutes_per_day_target: userData.daily_goal_minutes,
        url: window.location.href,
      });
      
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


'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  isLyticsReady, 
  onLyticsReady, 
  identifyUser, 
  trackPageView,
  getLyticsAccountId,
  getLyticsScriptContent
} from '@/lib/lytics';

// ============================================
// Types
// ============================================

interface UserPreferences {
  goal: string | null;
  role: string | null;
  education: string | null;
  topics: string[] | null;
  schedule: string | null;
  daily_goal_minutes: number | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
}

interface Enrollment {
  course_slug: string;
  status: string;
}

interface LyticsContextValue {
  isReady: boolean;
  isIdentified: boolean;
  userEmail: string | null;
}

// ============================================
// Context
// ============================================

const LyticsContext = createContext<LyticsContextValue>({
  isReady: false,
  isIdentified: false,
  userEmail: null,
});

export const useLytics = () => useContext(LyticsContext);

// ============================================
// Provider Component
// ============================================

interface LyticsProviderProps {
  children: ReactNode;
}

export function LyticsProvider({ children }: LyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Lytics script
  useEffect(() => {
    const accountId = getLyticsAccountId();
    
    console.log('[LyticsProvider] 🔧 Initializing Lytics...');
    console.log('[LyticsProvider] Account ID:', accountId ? `${accountId.substring(0, 8)}...` : 'NOT SET');
    
    if (!accountId) {
      console.error('[LyticsProvider] ❌ No Lytics account ID configured!');
      console.error('[LyticsProvider] Add NEXT_PUBLIC_LYTICS_ACCOUNT_ID to your .env.local file');
      return;
    }

    // Check if script is already loaded
    if (document.querySelector('script[data-lytics]')) {
      console.log('[LyticsProvider] Script already loaded');
      setScriptLoaded(true);
      return;
    }

    // Create and inject the script
    const script = document.createElement('script');
    script.setAttribute('data-lytics', 'true');
    script.innerHTML = getLyticsScriptContent(accountId);
    document.head.appendChild(script);
    
    console.log('[LyticsProvider] 🚀 Lytics script injected with Account ID:', accountId.substring(0, 8) + '...');
    console.log('[LyticsProvider] 💡 TIP: Call window.testLytics() in console to send test events!');
    setScriptLoaded(true);

    return () => {
      // Don't remove script on unmount as it might be needed
    };
  }, []);

  // Wait for Lytics to be ready
  useEffect(() => {
    if (!scriptLoaded) return;

    onLyticsReady(() => {
      setIsReady(true);
      console.log('[LyticsProvider] ✅ Lytics is READY and listening for events!');
      
      // Track initial page view
      trackPageView();
    });
  }, [scriptLoaded]);

  // Sync user data from Supabase to Lytics
  const syncUserToLytics = useCallback(async () => {
    const supabase = createClient();
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('[LyticsProvider] No authenticated user');
        return;
      }

      setUserEmail(user.email || null);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Fetch user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('goal, role, education, topics, schedule, daily_goal_minutes')
        .eq('user_id', user.id)
        .single();

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_slug, status')
        .eq('user_id', user.id);

      // Build Lytics identify data
      const lyticsData: Parameters<typeof identifyUser>[0] = {
        email: user.email || '',
        user_id: user.id,
        full_name: profile?.full_name || user.user_metadata?.full_name,
      };

      // Add preferences if they exist
      if (preferences) {
        lyticsData.goal = preferences.goal;
        lyticsData.role = preferences.role;
        lyticsData.education = preferences.education;
        lyticsData.topics = preferences.topics || [];
        lyticsData.schedule = preferences.schedule;
        lyticsData.daily_goal_minutes = preferences.daily_goal_minutes;
      }

      // Add enrollment data if it exists
      if (enrollments && enrollments.length > 0) {
        lyticsData.courses_enrolled = enrollments
          .filter((e: Enrollment) => e.status === 'enrolled' || e.status === 'in_progress')
          .map((e: Enrollment) => e.course_slug);
        lyticsData.courses_completed = enrollments
          .filter((e: Enrollment) => e.status === 'completed')
          .map((e: Enrollment) => e.course_slug);
      }

      // Send identify event to Lytics
      identifyUser(lyticsData);
      setIsIdentified(true);
      console.log('[LyticsProvider] 👤 User IDENTIFIED in Lytics!');
      console.table(lyticsData);

    } catch (error) {
      console.error('[LyticsProvider] Error syncing user to Lytics:', error);
    }
  }, []);

  // Listen for auth state changes and sync to Lytics
  useEffect(() => {
    if (!isReady) return;

    const supabase = createClient();

    // Initial sync
    syncUserToLytics();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('[LyticsProvider] User signed in, syncing to Lytics');
        syncUserToLytics();
      } else if (event === 'SIGNED_OUT') {
        console.log('[LyticsProvider] User signed out');
        setIsIdentified(false);
        setUserEmail(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isReady, syncUserToLytics]);

  return (
    <LyticsContext.Provider value={{ isReady, isIdentified, userEmail }}>
      {children}
    </LyticsContext.Provider>
  );
}

export default LyticsProvider;


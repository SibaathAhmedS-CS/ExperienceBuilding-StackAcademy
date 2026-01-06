'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { clearAllLyticsData, validateLyticsCookieOwnership } from '@/lib/lytics';

/**
 * LyticsInitializer - Validates and cleans Lytics data on app initialization
 * Runs once per session to ensure cookies match current user
 */
export function LyticsInitializer() {
  useEffect(() => {
    // Only run once per session (not on every route change)
    const initKey = 'lytics_initializer_ran';
    if (typeof window !== 'undefined' && sessionStorage.getItem(initKey)) {
      return; // Already initialized this session
    }
    
    const checkAndCleanLytics = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is logged in - validate cookie ownership
          const cookieIsValid = validateLyticsCookieOwnership(user.id);
          if (!cookieIsValid) {
            console.log('[LyticsInitializer] 🧹 Clearing stale Lytics data - cookie ownership mismatch');
            clearAllLyticsData();
          }
        } else {
          // User is not logged in - clear personalized cookies but keep seerid
          console.log('[LyticsInitializer] 🧹 User not logged in - clearing personalized Lytics data');
          clearAllLyticsData();
        }
        
        // Mark as initialized for this session
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(initKey, 'true');
        }
      } catch (error) {
        console.error('[LyticsInitializer] ❌ Error checking Lytics data:', error);
      }
    };
    
    // Wait a bit for Lytics SDK to load before checking
    setTimeout(checkAndCleanLytics, 1000);
  }, []);
  
  return null; // This component doesn't render anything
}


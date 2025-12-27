'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { preferences, loading: prefsLoading } = useUserPreferences();
  const hasRedirected = useRef(false);

  // Memoize the computed values to prevent infinite loops
  // Use preferences?.completed_at directly instead of calling functions
  const completedOnboarding = useMemo(() => {
    return preferences !== null && preferences.completed_at !== null;
  }, [preferences?.completed_at]);
  
  const hasPreferences = useMemo(() => {
    return preferences !== null;
  }, [preferences]);

  useEffect(() => {
    // Reset redirect flag when pathname changes
    hasRedirected.current = false;
  }, [pathname]);

  useEffect(() => {
    // Don't redirect if still loading
    if (authLoading || prefsLoading) return;

    // Prevent multiple redirects
    if (hasRedirected.current) return;

    // Don't redirect if already on auth pages
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      hasRedirected.current = true;
      router.push('/login');
      return;
    }

    // If authenticated but has no preferences entry, redirect to onboarding
    // BUT allow access to home page (user might have skipped onboarding)
    // They'll be asked again on next login
    if (isAuthenticated && user?.profile && !hasPreferences && pathname !== '/onboarding' && pathname !== '/home') {
      hasRedirected.current = true;
      router.push('/onboarding');
      return;
    }

    // If completed onboarding but on onboarding page, redirect to home
    if (isAuthenticated && user?.profile && completedOnboarding && pathname === '/onboarding') {
      hasRedirected.current = true;
      router.push('/home');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.profile, completedOnboarding, hasPreferences, authLoading, prefsLoading, pathname]);

  // Show loading state while checking auth
  if (authLoading || prefsLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

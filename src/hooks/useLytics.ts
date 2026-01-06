/**
 * useLytics Hook
 * Based on reference implementation pattern
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import lyticsService from '@/services/lytics';

interface UseLyticsOptions {
  trackPageViews?: boolean;
  startSession?: boolean;
}

const useLytics = (options: UseLyticsOptions = {}) => {
  const pathname = usePathname();
  const { trackPageViews = false, startSession = false } = options;
  
  const [userSegments, setUserSegments] = useState<string[]>([]);
  const [personalization, setPersonalization] = useState({
    segments: [] as string[],
    isHighValueLearner: false,
    isActiveLearner: false,
    isNewUser: false,
    isReturningVisitor: false,
    isRegistered: false,
    isMobileUser: false
  });
  const [segmentsLoading, setSegmentsLoading] = useState(true);

  useEffect(() => {
    if (trackPageViews && pathname) {
      const pageName = getPageName(pathname);
      lyticsService.trackPageView(pageName, {
        pathname: pathname
      });
    }
  }, [pathname, trackPageViews]);

  useEffect(() => {
    if (startSession) {
      lyticsService.startSessionTracking();
    }
  }, [startSession]);

  useEffect(() => {
    const loadSegments = async () => {
      setSegmentsLoading(true);
      try {
        const segments = await lyticsService.getUserSegments();
        const flags = await lyticsService.getPersonalizationFlags();
        setUserSegments(segments);
        setPersonalization(flags);
      } catch (error) {
        console.error('Failed to load user segments:', error);
      } finally {
        setSegmentsLoading(false);
      }
    };

    const timer = setTimeout(loadSegments, 2000);
    return () => clearTimeout(timer);
  }, []);

  const getPageName = useCallback((path: string): string => {
    const routes: Record<string, string> = {
      '/': 'Home',
      '/home': 'Dashboard',
      '/courses': 'Courses',
      '/my-courses': 'My Courses',
      '/login': 'Login',
      '/signup': 'Sign Up',
      '/onboarding': 'Onboarding'
    };

    if (path.startsWith('/course/')) {
      return 'Course Detail';
    }
    if (path.startsWith('/module/')) {
      return 'Module Detail';
    }

    return routes[path] || path;
  }, []);

  const trackEvent = useCallback((eventName: string, properties: Record<string, unknown> = {}) => {
    lyticsService.trackEvent(eventName, {
      current_page: getPageName(pathname || ''),
      ...properties
    });
  }, [pathname, getPageName]);

  const trackClick = useCallback((elementName: string, properties: Record<string, unknown> = {}) => {
    lyticsService.trackClick(elementName, {
      current_page: getPageName(pathname || ''),
      ...properties
    });
  }, [pathname, getPageName]);

  const trackCourseView = useCallback((course: {
    slug: string;
    title?: string;
    category?: string;
    instructor_name?: string;
  }) => {
    lyticsService.trackCourseView(course);
  }, []);

  const trackCourseEnroll = useCallback((course: {
    slug: string;
    title?: string;
    category?: string;
  }) => {
    lyticsService.trackCourseEnroll(course);
  }, []);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    lyticsService.trackSearch(query, resultsCount);
  }, []);

  const trackFilter = useCallback((filterType: string, filterValue: string) => {
    lyticsService.trackFilter(filterType, filterValue);
  }, []);

  const trackNavigation = useCallback((menuItem: string, url: string) => {
    lyticsService.trackNavigation(menuItem, url);
  }, []);

  const identifyUser = useCallback((userData: {
    email: string;
    id?: string;
    name?: string;
    createdAt?: string;
  }) => {
    lyticsService.identifyUser(userData);
  }, []);

  const clearUser = useCallback(() => {
    lyticsService.clearUser();
  }, []);

  const isInSegment = useCallback((segmentSlug: string): boolean => {
    return userSegments.includes(segmentSlug);
  }, [userSegments]);

  const refreshSegments = useCallback(async () => {
    setSegmentsLoading(true);
    try {
      const segments = await lyticsService.getUserSegments();
      const flags = await lyticsService.getPersonalizationFlags();
      setUserSegments(segments);
      setPersonalization(flags);
    } catch (error) {
      console.error('Failed to refresh segments:', error);
    } finally {
      setSegmentsLoading(false);
    }
  }, []);

  return {
    trackEvent,
    trackClick,
    trackCourseView,
    trackCourseEnroll,
    trackSearch,
    trackFilter,
    trackNavigation,
    identifyUser,
    clearUser,
    
    userSegments,
    personalization,
    segmentsLoading,
    isInSegment,
    refreshSegments,
    
    lytics: lyticsService
  };
};

export default useLytics;

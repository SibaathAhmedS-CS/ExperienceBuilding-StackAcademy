'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, Chrome } from 'lucide-react';
import { useAuthBranding } from '@/hooks/useAuthBranding';
import { IconEntry, normalizeArray } from '@/types/contentstack';
import lyticsService from '@/services/lytics';
import { cacheUserProfile } from '@/utils/userCache';
import styles from '../auth.module.css';
import onboardingStyles from '../onboarding/onboarding.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectingToHome, setRedirectingToHome] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isOAuthRedirect, setIsOAuthRedirect] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  // Check for OAuth callback errors in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if user is already logged in on mount (only if not currently logging in)
  useEffect(() => {
    // Don't check session if we're in the middle of logging in or OAuth redirect
    if (isLoggingIn || redirectingToHome || isOAuthRedirect) {
      return;
    }

    const checkSession = async () => {
      try {
        // Check if we're coming from an OAuth redirect by checking URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code') || urlParams.has('error')) {
          // We're in the middle of an OAuth flow, don't check session
          setIsOAuthRedirect(true);
          setCheckingSession(false);
          return;
        }

        // Get session (not just user) to ensure it's valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If there's a session error or no valid session, don't auto-login
        if (sessionError || !session) {
          lyticsService.setAnonymousProfile();
          setCheckingSession(false);
          return;
        }

        // Verify the session is still valid by getting the user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          // Session is invalid, clear it
          await supabase.auth.signOut();
          lyticsService.setAnonymousProfile();
          setCheckingSession(false);
          return;
        }

        // User is already logged in - check preferences
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (prefs) {
          // Preferences exist - redirect to home using replace to avoid history issues
          window.location.replace('/home');
        } else {
          // No preferences - redirect to onboarding using replace
          window.location.replace('/onboarding');
        }
      } catch (error) {
        // Set anonymous profile even on error (doesn't clear cookies)
        lyticsService.setAnonymousProfile();
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase, isLoggingIn, redirectingToHome, isOAuthRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoggingIn(true);
    setError('');
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      setIsLoggingIn(false);
      return;
    }

    // Update last_login_at timestamp in profiles table
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // CASE 1.1 & 1.2: Check if preferences exist
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (prefs) {
      // Case 1.1: Preferences exist -> identify user with preferences, wait for audience processing, then refresh
      setRedirectingToHome(true);
      
      // Import preference tracking to sync preferences
      const { syncPreferencesToLytics } = await import('@/services/preferenceTracking');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.user.id)
        .single();
      
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('goal, role, education, topics, schedule, daily_goal_minutes')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      // Fetch enrollments for course counts
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('status')
        .eq('user_id', data.user.id);

      const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
      const inProgressCount = enrollments?.filter(e => e.status === 'enrolled').length || 0;
      const total_completed_courses = completedCount;
      
      // Error fetching enrollments - continue without enrollment counts
      
      // Cache user profile data for faster access
      cacheUserProfile(data.user.id, {
        name: profile?.full_name || data.user.email?.split('@')[0] || 'User',
        email: data.user.email || '',
        avatar: profile?.avatar_url || undefined,
        coursesCompleted: completedCount,
        coursesInProgress: inProgressCount,
      });
      
      if (userPrefs) {
        await syncPreferencesToLytics(
          {
            email: data.user.email || '',
            user_id: data.user.id,
            full_name: profile?.full_name || undefined,
          },
          userPrefs,
          total_completed_courses
        );
        
        // Wait a bit for audience processing, then redirect to home
        setTimeout(() => {
          window.location.replace('/home');
        }, 3000);
      } else {
        // No preferences but user exists - just redirect
        setTimeout(() => {
          window.location.replace('/home');
        }, 2000);
      }
    } else {
      // Case 1.2: No preferences -> redirect to onboarding (normal redirect, no special animation)
      window.location.replace('/onboarding');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsOAuthRedirect(true);
      setError('');
      
      // Get the current origin - ensure we're using the correct protocol and host
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/auth/callback`;
      
      // Log for debugging
      console.log('OAuth redirect URL:', redirectUrl);
      console.log('Current origin:', currentOrigin);
      console.log('Current URL:', window.location.href);
      
      // Validate that we're not accidentally using localhost:4000
      if (redirectUrl.includes('localhost:4000')) {
        console.warn('Warning: Redirect URL contains localhost:4000. Current origin:', currentOrigin);
        setError('Invalid redirect configuration. Please check your Supabase settings.');
        setIsOAuthRedirect(false);
        return;
      }
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent', // Force consent screen to show
          }
        }
      });

      if (oauthError) {
        console.error('OAuth error:', oauthError);
        setError(oauthError.message);
        setIsOAuthRedirect(false);
        return;
      }

      // If data.url exists, the redirect will happen automatically
      // If not, there might be an issue
      if (!data.url) {
        setError('Failed to initiate Google login. Please try again.');
        setIsOAuthRedirect(false);
        return;
      }
      
      // Log the OAuth URL for debugging
      console.log('OAuth URL generated:', data.url);
      
      // Verify the redirect URL in the OAuth URL matches what we expect
      try {
        const oauthUrlObj = new URL(data.url);
        const redirectParam = oauthUrlObj.searchParams.get('redirect_to');
        if (redirectParam && redirectParam.includes('localhost:4000')) {
          console.error('Supabase is using localhost:4000 in redirect URL:', redirectParam);
          setError('Redirect URL misconfiguration detected. Please check your Supabase project settings and ensure the correct redirect URLs are configured.');
          setIsOAuthRedirect(false);
          return;
        }
      } catch (urlError) {
        console.warn('Could not parse OAuth URL:', urlError);
      }
    } catch (error) {
      console.error('Error initiating Google login:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsOAuthRedirect(false);
    }
  };

  // Fetch auth branding data from Contentstack
  const { brandingData, isLoading: brandingLoading } = useAuthBranding('login');

  // Extract brand side data from CMS
  // stats is IconEntry reference(s) - use icon_title as number, description as label
  let statsArray: IconEntry[] = [];
  
  if (brandingData?.stats) {
    const stats = brandingData.stats;
    // Handle both expanded references (full objects) and unexpanded references (just UIDs)
    if (Array.isArray(stats)) {
      statsArray = stats.filter((stat: any) => {
        // Check if it's an expanded icon entry (has icon_name, icon_title, etc.)
        return stat && (stat.icon_name || stat.icon_title || stat.title);
      }) as IconEntry[];
    } else if (stats && typeof stats === 'object' && (stats.icon_name || stats.icon_title || stats.title)) {
      statsArray = [stats as IconEntry];
    }
  }


  const brandData = {
    headline: brandingData?.headline || 'Welcome Back!',
    subtitle: brandingData?.subtitle || 'Continue your learning journey and unlock new skills.',
    brandingContent: brandingData?.branding_content || '',  // Rich text HTML
    stats: statsArray.length > 0
      ? statsArray.map((stat: IconEntry) => ({
          number: stat.icon_title || stat.title || '',
          text: stat.description || stat.title || '',
          iconName: stat.icon_name || 'book-open',
        }))
      : [
          { number: '1000+', text: 'Courses', iconName: 'book-open' },
          { number: '50K+', text: 'Students', iconName: 'users' },
          { number: '200+', text: 'Instructors', iconName: 'graduation-cap' },
        ],
  };

  // Show "Curating Content" animation only when redirecting to home after login
  if (redirectingToHome) {
    return (
      <div className={onboardingStyles.loadingContainer}>
        <div className={onboardingStyles.curatingSpinner}>
          <div className={onboardingStyles.curatingIcon}>
            <BookOpen size={48} style={{ color: 'white', opacity: 1 }} />
          </div>
          <div className={onboardingStyles.curatingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <h2 className={onboardingStyles.curatingTitle}>Curating Your Experience</h2>
        <p className={onboardingStyles.curatingSubtitle}>Loading your content...</p>
      </div>
    );
  }

  // Show normal loading screen for checking session, loading branding, or OAuth redirect
  if (checkingSession || brandingLoading || isOAuthRedirect) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      {/* Left Side - Branding */}
      <div className={styles.brandSide}>
        <div className={styles.brandContent}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <BookOpen size={28} />
            </div>
            <span className={styles.logoText}>StackAcademy</span>
          </Link>

          <div className={styles.brandMessage}>
            <h1>{brandData.headline}</h1>
            <p>{brandData.subtitle}</p>
            {brandData.brandingContent && (
              <div 
                className={styles.brandingContent}
                dangerouslySetInnerHTML={{ __html: brandData.brandingContent }}
              />
            )}
          </div>

          <div className={styles.brandStats}>
            {brandData.stats.map((stat: { number: string; text: string; iconName?: string }, index: number) => (
              <div key={index} className={styles.brandStat}>
                <span className={styles.statNumber}>{stat.number}</span>
                <span className={styles.statText}>{stat.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.decorElements}>
            <div className={styles.decorCircle1} />
            <div className={styles.decorCircle2} />
            <div className={styles.decorCircle3} />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Sign In</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          {/* Social Login */}
          <div className={styles.socialLogin}>
            <button 
              className={styles.socialBtn}
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <Chrome size={20} />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span>or continue with email</span>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.inputIcon} />
                <input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="password">Password</label>
              </div>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Don't have an account?{' '}
            <Link href="/signup">Sign up for free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
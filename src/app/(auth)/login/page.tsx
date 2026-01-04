'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, Chrome } from 'lucide-react';
import { useAuthBranding } from '@/hooks/useAuthBranding';
import { IconEntry, normalizeArray } from '@/types/contentstack';
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
  
  const supabase = createClient();
  const router = useRouter();

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is already logged in - check preferences
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (prefs) {
            // Preferences exist - redirect to home
            router.push('/home');
          } else {
            // No preferences - redirect to onboarding
            router.push('/onboarding');
          }
        } else {
          // No session - show login form
          setCheckingSession(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
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
      // Case 1.1: Preferences exist -> show curating content animation and redirect to home
      setRedirectingToHome(true);
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    } else {
      // Case 1.2: No preferences -> redirect to onboarding (normal redirect, no special animation)
      router.push('/onboarding');
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
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

  console.log('Login branding data:', brandingData);
  console.log('Stats array:', statsArray);
  console.log('Branding content:', brandingData?.branding_content);

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
        <p className={onboardingStyles.curatingSubtitle}>Loading your personalized content...</p>
      </div>
    );
  }

  // Show normal loading screen for checking session or loading branding
  if (checkingSession || brandingLoading) {
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
                <Link href="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
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
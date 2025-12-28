// 'use client';

// import { useState } from 'react';
// import Link from 'next/link';
// import { 
//   Mail, 
//   Lock, 
//   Eye, 
//   EyeOff, 
//   BookOpen,
//   ArrowRight,
//   Chrome
// } from 'lucide-react';
// import styles from '../auth.module.css';

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError('');
    
//     // UI only - no actual authentication
//     setTimeout(() => {
//       setIsLoading(false);
//       // Redirect to courses
//       window.location.href = '/courses';
//     }, 1000);
//   };

//   const handleGoogleLogin = async () => {
//     setIsLoading(true);
//     setError('');
    
//     // UI only - no actual authentication
//     setTimeout(() => {
//       setIsLoading(false);
//       window.location.href = '/courses';
//     }, 1000);
//   };

//   return (
//     <div className={styles.authPage}>
//       {/* Left Side - Branding */}
//       <div className={styles.brandSide}>
//         <div className={styles.brandContent}>
//           <Link href="/" className={styles.logo}>
//             <div className={styles.logoIcon}>
//               <BookOpen size={28} />
//             </div>
//             <span className={styles.logoText}>StackAcademy</span>
//           </Link>

//           <div className={styles.brandMessage}>
//             <h1>Welcome Back!</h1>
//             <p>Continue your learning journey and unlock new skills.</p>
//           </div>

//           <div className={styles.brandStats}>
//             <div className={styles.brandStat}>
//               <span className={styles.statNumber}>1000+</span>
//               <span className={styles.statText}>Courses</span>
//             </div>
//             <div className={styles.brandStat}>
//               <span className={styles.statNumber}>50K+</span>
//               <span className={styles.statText}>Students</span>
//             </div>
//             <div className={styles.brandStat}>
//               <span className={styles.statNumber}>200+</span>
//               <span className={styles.statText}>Instructors</span>
//             </div>
//           </div>

//           <div className={styles.decorElements}>
//             <div className={styles.decorCircle1} />
//             <div className={styles.decorCircle2} />
//             <div className={styles.decorCircle3} />
//           </div>
//         </div>
//       </div>

//       {/* Right Side - Form */}
//       <div className={styles.formSide}>
//         <div className={styles.formContainer}>
//           <div className={styles.formHeader}>
//             <h2>Sign In</h2>
//             <p>Enter your credentials to access your account</p>
//           </div>

//           {/* Social Login */}
//           <div className={styles.socialLogin}>
//             <button 
//               className={styles.socialBtn}
//               onClick={handleGoogleLogin}
//               disabled={isLoading}
//             >
//               <Chrome size={20} />
//               <span>Continue with Google</span>
//             </button>
//           </div>

//           <div className={styles.divider}>
//             <span>or continue with email</span>
//           </div>

//           {/* Login Form */}
//           <form onSubmit={handleSubmit} className={styles.form}>
//             {error && (
//               <div className={styles.errorMessage}>
//                 {error}
//               </div>
//             )}

//             <div className={styles.inputGroup}>
//               <label htmlFor="email">Email Address</label>
//               <div className={styles.inputWrapper}>
//                 <Mail size={20} className={styles.inputIcon} />
//                 <input
//                   type="email"
//                   id="email"
//                   placeholder="you@example.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   disabled={isLoading}
//                 />
//               </div>
//             </div>

//             <div className={styles.inputGroup}>
//               <div className={styles.labelRow}>
//                 <label htmlFor="password">Password</label>
//                 <Link href="/forgot-password" className={styles.forgotLink}>
//                   Forgot password?
//                 </Link>
//               </div>
//               <div className={styles.inputWrapper}>
//                 <Lock size={20} className={styles.inputIcon} />
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   id="password"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   disabled={isLoading}
//                 />
//                 <button
//                   type="button"
//                   className={styles.togglePassword}
//                   onClick={() => setShowPassword(!showPassword)}
//                 >
//                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
//             </div>

//             <button 
//               type="submit" 
//               className={styles.submitBtn}
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 <div className={styles.spinner} />
//               ) : (
//                 <>
//                   Sign In
//                   <ArrowRight size={20} />
//                 </>
//               )}
//             </button>
//           </form>

//           <p className={styles.switchAuth}>
//             Don't have an account?{' '}
//             <Link href="/signup">Sign up for free</Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, Eye, EyeOff, BookOpen, ArrowRight, Chrome } from 'lucide-react';
import styles from '../auth.module.css';
import onboardingStyles from '../onboarding/onboarding.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already logged in - check preferences
          const { data: prefs } = await supabase
            .from('user_preferences')
            .select('id')
            .eq('user_id', session.user.id)
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

    // CASE 1.1 & 1.2: Check if preferences exist
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (prefs) {
      router.push('/home'); // Case 1.1: Preferences exist -> home
    } else {
      router.push('/onboarding'); // Case 1.2: No preferences -> onboarding
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  };

  // Show loading while checking session - use same "Curating Content" animation
  if (checkingSession) {
    return (
      <div className={onboardingStyles.loadingContainer}>
        <div className={onboardingStyles.curatingSpinner}>
          <BookOpen size={48} color="white" />
        </div>
        <h2 className={onboardingStyles.curatingTitle}>Curating Your Experience</h2>
        <p className={onboardingStyles.curatingSubtitle}>Loading your personalized content...</p>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.brandSide}>
        <div className={styles.brandContent}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}><BookOpen size={28} /></div>
            <span className={styles.logoText}>StackAcademy</span>
          </Link>
          <div className={styles.brandMessage}>
            <h1>Welcome Back!</h1>
            <p>Continue your learning journey.</p>
          </div>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}><h2>Sign In</h2></div>
          <div className={styles.socialLogin}>
            <button className={styles.socialBtn} onClick={handleGoogleLogin} disabled={isLoading}>
              <Chrome size={20} /><span>Continue with Google</span>
            </button>
          </div>
          <div className={styles.divider}><span>or continue with email</span></div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.inputGroup}>
              <label>Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.inputIcon} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                <button type="button" className={styles.togglePassword} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? <div className={styles.spinner} /> : 'Sign In'}
            </button>
          </form>
          <p className={styles.switchAuth}>Don't have an account? <Link href="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
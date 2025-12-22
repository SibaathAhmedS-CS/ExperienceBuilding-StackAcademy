'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  BookOpen,
  ArrowRight,
  Github,
  Chrome
} from 'lucide-react';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate login - Replace with actual authentication
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Validate credentials (mock)
      if (email && password) {
        // Store user session (mock)
        localStorage.setItem('user', JSON.stringify({
          name: 'John Doe',
          email: email,
          coursesCompleted: 5,
          coursesInProgress: 3,
        }));
        router.push('/home');
      } else {
        setError('Please enter valid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1>Welcome Back!</h1>
            <p>Continue your learning journey and unlock new skills.</p>
          </div>

          <div className={styles.brandStats}>
            <div className={styles.brandStat}>
              <span className={styles.statNumber}>1000+</span>
              <span className={styles.statText}>Courses</span>
            </div>
            <div className={styles.brandStat}>
              <span className={styles.statNumber}>50K+</span>
              <span className={styles.statText}>Students</span>
            </div>
            <div className={styles.brandStat}>
              <span className={styles.statNumber}>200+</span>
              <span className={styles.statText}>Instructors</span>
            </div>
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
            <button className={styles.socialBtn}>
              <Chrome size={20} />
              <span>Continue with Google</span>
            </button>
            <button className={styles.socialBtn}>
              <Github size={20} />
              <span>Continue with GitHub</span>
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

            <div className={styles.rememberMe}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span className={styles.checkmark}></span>
                <span>Remember me for 30 days</span>
              </label>
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


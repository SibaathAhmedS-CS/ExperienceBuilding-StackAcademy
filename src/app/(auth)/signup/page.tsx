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
  Chrome,
  User,
  CheckCircle
} from 'lucide-react';
import styles from '../auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'Contains number', met: /[0-9]/.test(formData.password) },
    { label: 'Passwords match', met: formData.password === formData.confirmPassword && formData.password.length > 0 },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      setIsLoading(false);
      return;
    }

    // Simulate signup - Replace with actual registration
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store user session (mock)
      localStorage.setItem('user', JSON.stringify({
        name: formData.name,
        email: formData.email,
        coursesCompleted: 0,
        coursesInProgress: 0,
      }));
      
      router.push('/home');
    } catch (err) {
      setError('Registration failed. Please try again.');
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
            <h1>Start Your Journey</h1>
            <p>Join thousands of learners transforming their careers with industry-leading courses.</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <CheckCircle size={20} />
              <span>Access to 1000+ courses</span>
            </div>
            <div className={styles.featureItem}>
              <CheckCircle size={20} />
              <span>Learn from industry experts</span>
            </div>
            <div className={styles.featureItem}>
              <CheckCircle size={20} />
              <span>Earn verified certificates</span>
            </div>
            <div className={styles.featureItem}>
              <CheckCircle size={20} />
              <span>Lifetime access to content</span>
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
            <h2>Create Account</h2>
            <p>Fill in your details to get started</p>
          </div>

          {/* Social Login */}
          <div className={styles.socialLogin}>
            <button className={styles.socialBtn}>
              <Chrome size={20} />
              <span>Sign up with Google</span>
            </button>
            <button className={styles.socialBtn}>
              <Github size={20} />
              <span>Sign up with GitHub</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span>or sign up with email</span>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="name">Full Name</label>
              <div className={styles.inputWrapper}>
                <User size={20} className={styles.inputIcon} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.inputIcon} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className={styles.passwordRequirements}>
              {passwordRequirements.map((req, index) => (
                <div 
                  key={index} 
                  className={`${styles.requirement} ${req.met ? styles.met : ''}`}
                >
                  <CheckCircle size={14} />
                  <span>{req.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.rememberMe}>
              <label className={styles.checkbox}>
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className={styles.checkmark}></span>
                <span>
                  I agree to the{' '}
                  <Link href="/terms">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy">Privacy Policy</Link>
                </span>
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
                  Create Account
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


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
//   Chrome,
//   User,
//   CheckCircle
// } from 'lucide-react';
// import styles from '../auth.module.css';

// export default function SignupPage() {
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     password: '',
//     confirmPassword: '',
//   });
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');

//   const passwordRequirements = [
//     { label: 'At least 8 characters', met: formData.password.length >= 8 },
//     { label: 'Contains uppercase letter', met: /[A-Z]/.test(formData.password) },
//     { label: 'Contains number', met: /[0-9]/.test(formData.password) },
//     { label: 'Passwords match', met: formData.password === formData.confirmPassword && formData.password.length > 0 },
//   ];

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError('');

//     // Validate
//     if (formData.password !== formData.confirmPassword) {
//       setError('Passwords do not match');
//       setIsLoading(false);
//       return;
//     }

//     if (formData.password.length < 8) {
//       setError('Password must be at least 8 characters');
//       setIsLoading(false);
//       return;
//     }

//     // UI only - no actual authentication
//     setTimeout(() => {
//       setIsLoading(false);
//       window.location.href = '/courses';
//     }, 1000);
//   };

//   const handleGoogleSignup = async () => {
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
//             <h1>Start Your Journey</h1>
//             <p>Join thousands of learners transforming their careers with industry-leading courses.</p>
//           </div>

//           <div className={styles.features}>
//             <div className={styles.featureItem}>
//               <CheckCircle size={20} />
//               <span>Access to 1000+ courses</span>
//             </div>
//             <div className={styles.featureItem}>
//               <CheckCircle size={20} />
//               <span>Learn from industry experts</span>
//             </div>
//             <div className={styles.featureItem}>
//               <CheckCircle size={20} />
//               <span>Earn verified certificates</span>
//             </div>
//             <div className={styles.featureItem}>
//               <CheckCircle size={20} />
//               <span>Lifetime access to content</span>
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
//             <h2>Create Account</h2>
//             <p>Fill in your details to get started</p>
//           </div>

//           {/* Social Login */}
//           <div className={styles.socialLogin}>
//             <button 
//               className={styles.socialBtn}
//               onClick={handleGoogleSignup}
//               disabled={isLoading}
//             >
//               <Chrome size={20} />
//               <span>Sign up with Google</span>
//             </button>
//           </div>

//           <div className={styles.divider}>
//             <span>or sign up with email</span>
//           </div>

//           {/* Signup Form */}
//           <form onSubmit={handleSubmit} className={styles.form}>
//             {error && (
//               <div className={styles.errorMessage}>
//                 {error}
//               </div>
//             )}

//             <div className={styles.inputGroup}>
//               <label htmlFor="name">Full Name</label>
//               <div className={styles.inputWrapper}>
//                 <User size={20} className={styles.inputIcon} />
//                 <input
//                   type="text"
//                   id="name"
//                   name="name"
//                   placeholder="John Doe"
//                   value={formData.name}
//                   onChange={handleChange}
//                   required
//                   disabled={isLoading}
//                 />
//               </div>
//             </div>

//             <div className={styles.inputGroup}>
//               <label htmlFor="email">Email Address</label>
//               <div className={styles.inputWrapper}>
//                 <Mail size={20} className={styles.inputIcon} />
//                 <input
//                   type="email"
//                   id="email"
//                   name="email"
//                   placeholder="you@example.com"
//                   value={formData.email}
//                   onChange={handleChange}
//                   required
//                   disabled={isLoading}
//                 />
//               </div>
//             </div>

//             <div className={styles.inputGroup}>
//               <label htmlFor="password">Password</label>
//               <div className={styles.inputWrapper}>
//                 <Lock size={20} className={styles.inputIcon} />
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   id="password"
//                   name="password"
//                   placeholder="Create a strong password"
//                   value={formData.password}
//                   onChange={handleChange}
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

//             <div className={styles.inputGroup}>
//               <label htmlFor="confirmPassword">Confirm Password</label>
//               <div className={styles.inputWrapper}>
//                 <Lock size={20} className={styles.inputIcon} />
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   id="confirmPassword"
//                   name="confirmPassword"
//                   placeholder="Confirm your password"
//                   value={formData.confirmPassword}
//                   onChange={handleChange}
//                   required
//                   disabled={isLoading}
//                 />
//               </div>
//             </div>

//             {/* Password Requirements */}
//             <div className={styles.passwordRequirements}>
//               {passwordRequirements.map((req, index) => (
//                 <div 
//                   key={index} 
//                   className={`${styles.requirement} ${req.met ? styles.met : ''}`}
//                 >
//                   <CheckCircle size={14} />
//                   <span>{req.label}</span>
//                 </div>
//               ))}
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
//                   Create Account
//                   <ArrowRight size={20} />
//                 </>
//               )}
//             </button>
//           </form>

//           <p className={styles.switchAuth}>
//             Already have an account?{' '}
//             <Link href="/login">Sign in</Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { BookOpen, User, Mail, Lock, ArrowRight } from 'lucide-react';
import styles from '../auth.module.css';

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { 
        data: { full_name: formData.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
    } else {
      // New users go to onboarding
      window.location.href = '/onboarding';
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}><h2>Create Account</h2></div>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required disabled={isLoading} />
            </div>
            <div className={styles.inputGroup}>
                <label>Email</label>
                <input type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={isLoading} />
            </div>
            <div className={styles.inputGroup}>
                <label>Password</label>
                <input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required disabled={isLoading} />
            </div>
            <div className={styles.inputGroup}>
                <label>Confirm Password</label>
                <input type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required disabled={isLoading} />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
               {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className={styles.switchAuth}>Already have an account? <Link href="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}


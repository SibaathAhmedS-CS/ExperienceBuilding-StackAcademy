// 'use client';

// import { useState, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import {
//   BookOpen,
//   ArrowLeft,
//   ArrowRight,
//   Search,
//   Check,
//   Rocket,
//   Shuffle,
//   TrendingUp,
//   Glasses,
//   Zap,
//   Cpu,
//   Layers,
//   Code,
//   BarChart2,
//   Palette,
//   Shield,
//   Cloud,
//   GitBranch,
//   Briefcase,
//   Book,
//   Award,
//   GraduationCap,
//   Terminal,
//   Globe,
//   Smartphone,
//   Clock,
//   LucideIcon,
// } from 'lucide-react';
// import styles from './onboarding.module.css';
// import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';

// // Comprehensive icon map
// const iconMap: Record<string, LucideIcon> = {
//   'rocket': Rocket,
//   'shuffle': Shuffle,
//   'trending-up': TrendingUp,
//   'glasses': Glasses,
//   'zap': Zap,
//   'cpu': Cpu,
//   'layers': Layers,
//   'code': Code,
//   'bar-chart-2': BarChart2,
//   'palette': Palette,
//   'shield': Shield,
//   'cloud': Cloud,
//   'git-branch': GitBranch,
//   'briefcase': Briefcase,
//   'book': Book,
//   'book-open': BookOpen,
//   'award': Award,
//   'graduation-cap': GraduationCap,
//   'terminal': Terminal,
//   'globe': Globe,
//   'smartphone': Smartphone,
//   'clock': Clock,
// };

// export default function OnboardingPage() {
//   const router = useRouter();
//   const { steps, isLoading: stepsLoading } = useOnboarding();
//   const [currentStepIndex, setCurrentStepIndex] = useState(0);
//   const [selections, setSelections] = useState<Record<number, string[]>>({});
//   const [searchQuery, setSearchQuery] = useState('');
//   const [isSaving, setIsSaving] = useState(false);
//   const [isRedirecting, setIsRedirecting] = useState(false);

//   const currentStep = steps[currentStepIndex];
//   const totalSteps = steps.length || 5;

//   // Filter options based on search query
//   const filteredOptions = useMemo(() => {
//     if (!currentStep) return [];
//     if (!searchQuery.trim()) return currentStep.options;
    
//     const query = searchQuery.toLowerCase();
//     return currentStep.options.filter(opt => 
//       opt.label.toLowerCase().includes(query) || 
//       opt.description.toLowerCase().includes(query)
//     );
//   }, [currentStep, searchQuery]);

//   const handleSelect = (optionId: string) => {
//     const stepNum = currentStepIndex;
//     const currentSelections = selections[stepNum] || [];
    
//     // For most steps, allow single selection. For topics, allow multiple
//     if (currentStepIndex === 3) {
//       // Step 4: Topics - allow multiple selections
//       if (currentSelections.includes(optionId)) {
//         setSelections({
//           ...selections,
//           [stepNum]: currentSelections.filter(id => id !== optionId),
//         });
//       } else {
//         setSelections({
//           ...selections,
//           [stepNum]: [...currentSelections, optionId],
//         });
//       }
//     } else {
//       // Single selection for other steps
//       setSelections({
//         ...selections,
//         [stepNum]: [optionId],
//       });
//     }
//   };

//   const isSelected = (optionId: string) => {
//     return (selections[currentStepIndex] || []).includes(optionId);
//   };

//   const canProceed = (selections[currentStepIndex] || []).length > 0;

//   const handleNext = async () => {
//     if (currentStepIndex < steps.length - 1) {
//       setCurrentStepIndex(currentStepIndex + 1);
//       setSearchQuery('');
//     } else {
//       // Save preferences (UI only - no database)
//       await handleSavePreferences();
//     }
//   };

//   const handleSavePreferences = async () => {
//     setIsSaving(true);
    
//     try {
//       // Collect all selections
//       const preferences = {
//         goal: selections[0]?.[0] || null,
//         role: selections[1]?.[0] || null,
//         education: selections[2]?.[0] || null,
//         topics: selections[3] || [],
//         schedule: selections[4]?.[0] || null,
//       };

//       console.log('User preferences collected:', preferences);
      
//       // Store in localStorage for now (can be used later)
//       localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
//       // Stop saving state first
//       setIsSaving(false);
      
//       // Set redirecting state immediately - this will trigger re-render
//       setIsRedirecting(true);
      
//       // Use double requestAnimationFrame to ensure DOM update happens
//       // This ensures the animation component renders before we redirect
//       requestAnimationFrame(() => {
//         requestAnimationFrame(() => {
//           // Wait to show the animation before redirecting (2.5 seconds)
//           setTimeout(() => {
//             window.location.href = '/home';
//           }, 2500);
//         });
//       });
//     } catch (error: any) {
//       console.error('Error saving preferences:', error);
//       setIsSaving(false);
//       setIsRedirecting(false);
//       alert(`Failed to save preferences: ${error.message || 'Please try again.'}`);
//     }
//   };

//   const handleSkip = async () => {
//     // Don't save anything - just show loading animation and redirect to home
//     setIsRedirecting(true);
    
//     // Wait a bit to show the animation before redirecting
//     setTimeout(() => {
//       window.location.href = '/home';
//     }, 1500);
//   };

//   const handleBack = () => {
//     if (currentStepIndex > 0) {
//       setCurrentStepIndex(currentStepIndex - 1);
//       setSearchQuery('');
//     }
//   };

//   if (stepsLoading) {
//     return (
//       <div className={styles.loadingContainer}>
//         <div className={styles.spinner} />
//         <p>Preparing your personalized experience...</p>
//       </div>
//     );
//   }

//   if (isRedirecting) {
//     return (
//       <div className={styles.loadingContainer} style={{ zIndex: 9999 }}>
//         <div className={styles.curatingSpinner}>
//           <div className={styles.curatingIcon}>
//             <BookOpen size={48} style={{ color: 'white', opacity: 1 }} />
//           </div>
//           <div className={styles.curatingDots}>
//             <span></span>
//             <span></span>
//             <span></span>
//           </div>
//         </div>
//         <h2 className={styles.curatingTitle}>Curating Content</h2>
//         <p className={styles.curatingSubtitle}>According to your preferences...</p>
//       </div>
//     );
//   }

//   if (!currentStep) {
//     return (
//       <div className={styles.errorContainer}>
//         <p>Unable to load onboarding. Please try again.</p>
//         <button onClick={() => router.push('/home')} className={styles.skipBtn}>
//           Skip to Home
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.onboardingPage}>
//       {/* Header */}
//       <header className={styles.header}>
//         <Link href="/" className={styles.logo}>
//           <div className={styles.logoIcon}>
//             <BookOpen size={24} />
//           </div>
//           <span className={styles.logoText}>StackAcademy</span>
//         </Link>
//         <button 
//           onClick={handleSkip} 
//           className={styles.skipBtn}
//           disabled={isRedirecting}
//         >
//           {isRedirecting ? 'Redirecting...' : 'Skip for now'}
//         </button>
//       </header>

//       {/* Progress Bar */}
//       <div className={styles.progressContainer}>
//         <div className={styles.progressBar}>
//           <div 
//             className={styles.progressFill} 
//             style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
//           />
//         </div>
//         <span className={styles.progressText}>
//           Step {currentStepIndex + 1} of {totalSteps}
//         </span>
//       </div>

//       {/* Main Content */}
//       <main className={styles.content}>
//         <div className={styles.stepContent}>
//           <h1 className={styles.question}>{currentStep.question}</h1>
          
//           {currentStepIndex === 3 ? (
//             <p className={styles.subtitle}>Select all topics that interest you</p>
//           ) : (
//             <p className={styles.subtitle}>Choose the option that best describes you</p>
//           )}

//           {/* Search Bar for Searchable Grid */}
//           {currentStep.displayType === 'Searchable Grid' && (
//             <div className={styles.searchWrapper}>
//               <Search size={20} className={styles.searchIcon} />
//               <input
//                 type="text"
//                 placeholder="Search options..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className={styles.searchInput}
//               />
//             </div>
//           )}

//           {/* Options Grid */}
//           <div className={`${styles.optionsGrid} ${currentStep.displayType === 'Card Grid' ? styles.cardGrid : styles.searchableGrid}`}>
//             {filteredOptions.map((option) => {
//               const IconComponent = iconMap[option.iconName] || Zap;
//               const selected = isSelected(option.id);
              
//               return (
//                 <button
//                   key={option.id}
//                   className={`${styles.optionCard} ${selected ? styles.selected : ''}`}
//                   onClick={() => handleSelect(option.id)}
//                 >
//                   <div className={styles.optionIconWrapper}>
//                     <IconComponent size={28} style={{ color: 'white', opacity: 1 }} />
//                   </div>
//                   <div className={styles.optionContent}>
//                     <span className={styles.optionLabel}>{option.label}</span>
//                     {option.description && (
//                       <span className={styles.optionDescription}>{option.description}</span>
//                     )}
//                   </div>
//                   {selected && (
//                     <div className={styles.checkmark}>
//                       <Check size={16} />
//                     </div>
//                   )}
//                 </button>
//               );
//             })}
//           </div>

//           {filteredOptions.length === 0 && searchQuery && (
//             <p className={styles.noResults}>No results found for &quot;{searchQuery}&quot;</p>
//           )}
//         </div>
//       </main>

//       {/* Footer Navigation */}
//       <footer className={styles.footer}>
//         <button
//           className={styles.backBtn}
//           onClick={handleBack}
//           disabled={currentStepIndex === 0}
//         >
//           <ArrowLeft size={20} />
//           {currentStep.backButtonText}
//         </button>
        
//         <button
//           className={styles.nextBtn}
//           onClick={handleNext}
//           disabled={!canProceed || isSaving}
//         >
//           {isSaving ? 'Saving...' : currentStep.nextButtonText}
//           <ArrowRight size={20} />
//         </button>
//       </footer>
//     </div>
//   );
// }



'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { BookOpen, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import styles from './onboarding.module.css';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingPage() {
  const supabase = createClient();
  const { steps, isLoading: stepsLoading } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkingPreferences, setCheckingPreferences] = useState(true);

  // Check if preferences exist on mount - if they do, redirect to home
  useEffect(() => {
    const checkPreferences = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          setCheckingPreferences(false);
          return;
        }
        
        if (user) {
          const { data: prefs, error } = await supabase
            .from('user_preferences')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

          // If error and it's not a "not found" error (PGRST116), log it
          // PGRST116 means no rows found, which is expected when preferences don't exist
          if (error && error.code !== 'PGRST116') {
            console.error('Error checking preferences:', error);
            // Still allow onboarding to proceed if there's an error checking
          }

          // If preferences exist, show loading and redirect to home
          if (prefs) {
            setIsRedirecting(true);
            setTimeout(() => {
              window.location.href = '/home';
            }, 1500);
            return;
          }
        }
      } catch (err) {
        console.error('Unexpected error checking preferences:', err);
      }
      
      setCheckingPreferences(false);
    };

    checkPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const currentStep = steps[currentStepIndex];

  const handleSelect = (optionId: string) => {
    const currentSelections = selections[currentStepIndex] || [];
    if (currentStepIndex === 3) { // Topics - Multiple
      setSelections({
        ...selections,
        [currentStepIndex]: currentSelections.includes(optionId) 
          ? currentSelections.filter(id => id !== optionId) 
          : [...currentSelections, optionId]
      });
    } else { // Others - Single
      setSelections({ ...selections, [currentStepIndex]: [optionId] });
    }
  };

  // Helper function to convert label to semantic value (slug)
  // e.g., "Start my career" -> "start-career", "Data Scientist" -> "data-scientist"
  const labelToSlug = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Helper function to get semantic value from option ID
  const getOptionValue = (stepIndex: number, optionId: string | undefined): string | null => {
    if (!optionId || !steps[stepIndex]) return null;
    
    const step = steps[stepIndex];
    const selectedOption = step.options.find(opt => opt.id === optionId);
    
    if (!selectedOption) return null;
    
    // Convert label to semantic slug (e.g., "Start my career" -> "start-career")
    return labelToSlug(selectedOption.label);
  };

  // Helper function to extract numeric schedule value from option label and convert to minutes
  // Returns as string since schedule column is TEXT (trigger converts to daily_goal_minutes INTEGER)
  // Handles different units: "5 minutes" -> "5", "1 hour" -> "60", "2 hours" -> "120"
  const getScheduleValue = (scheduleOptionId: string | undefined): string | null => {
    if (!scheduleOptionId || steps.length < 5) return null;
    
    // Find the schedule step (step 4, index 4)
    const scheduleStep = steps[4];
    if (!scheduleStep) return null;
    
    // Find the selected option
    const selectedOption = scheduleStep.options.find(opt => opt.id === scheduleOptionId);
    if (!selectedOption) return null;
    
    const label = selectedOption.label.toLowerCase();
    
    // Extract numeric value from label (e.g., "5 minutes", "1 hour", "2 hours")
    const match = label.match(/(\d+)\s*(minute|hour|hr|h|m|minutes|hours|hrs)/i);
    
    if (match) {
      const value = parseInt(match[1], 10);
      if (isNaN(value)) return null;
      
      const unit = match[2].toLowerCase();
      
      // Convert to minutes
      if (unit.includes('hour') || unit.includes('hr') || unit === 'h') {
        // Convert hours to minutes
        return (value * 60).toString();
      } else if (unit.includes('minute') || unit === 'm') {
        // Already in minutes
        return value.toString();
      }
      
      // Default: assume minutes if unit not recognized
      return value.toString();
    }
    
    // Fallback: try to extract just the number (assume minutes)
    const numberMatch = label.match(/\d+/);
    if (numberMatch) {
      const value = parseInt(numberMatch[0], 10);
      return isNaN(value) ? null : value.toString();
    }
    
    return null;
  };

  const handleNext = async () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      await handleSavePreferences();
    }
  };

  const handleSavePreferences = async () => {
    setIsRedirecting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      setIsRedirecting(false);
      alert('Please log in to save preferences');
      return;
    }

    try {
      // Extract semantic values from option labels instead of storing Contentstack UIDs
      // Step 0: Goal (e.g., "Start my career" -> "start-career")
      const goalValue = getOptionValue(0, selections[0]?.[0]);
      // Step 1: Role (e.g., "Data Scientist" -> "data-scientist")
      const roleValue = getOptionValue(1, selections[1]?.[0]);
      // Step 2: Education (e.g., "Bachelor's Degree" -> "bachelors-degree")
      const educationValue = getOptionValue(2, selections[2]?.[0]);
      // Step 3: Topics - keep as array of UIDs (or convert to slugs if needed)
      const topicsValue = selections[3] || [];
      // Step 4: Schedule - extract numeric value and convert to minutes
      // Handles: "5 minutes" -> "5", "1 hour" -> "60", "2 hours" -> "120"
      const scheduleValue = getScheduleValue(selections[4]?.[0]);
      
      // Case 1.2 & 2.2: Save preferences with completed_at timestamp
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          goal: goalValue, // Save semantic value ("start-career") instead of UID
          role: roleValue, // Save semantic value ("data-scientist") instead of UID
          education: educationValue, // Save semantic value ("bachelors-degree") instead of UID
          topics: topicsValue, // Keep as array (could convert to slugs if needed)
          schedule: scheduleValue, // Save as numeric string ("5", "15", "30", "60") instead of Contentstack UID
          completed_at: new Date().toISOString(), // Mark as completed
        })
        .select()
        .maybeSingle(); // Use maybeSingle() to handle cases gracefully

      if (error) {
        console.error('Error saving preferences:', error);
        setIsRedirecting(false);
        alert(`Failed to save preferences: ${error.message || 'Please try again.'}`);
        return;
      }

      // Log success even if data is null (upsert might succeed without returning data)
      if (data) {
        console.log('Preferences saved successfully:', data);
      }

      // Clear skip cookie since preferences are now saved
      document.cookie = 'skipped_onboarding=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Redirect to home after saving
      setTimeout(() => { window.location.href = '/home'; }, 2000);
    } catch (error: any) {
      console.error('Unexpected error saving preferences:', error);
      setIsRedirecting(false);
      alert(`Failed to save preferences: ${error.message || 'Please try again.'}`);
    }
  };

  const handleSkip = async () => {
    // Case 1.2.1 & 2.2.1: Don't save preferences - just redirect to home
    // Set a session cookie to allow temporary access to home for this session
    // On next login, user will be asked for preferences again (since no preferences row exists)
    setIsRedirecting(true);
    
    // Set a session cookie (expires when browser closes) to allow temporary home access
    document.cookie = 'skipped_onboarding=true; path=/; SameSite=Lax';
    
    setTimeout(() => { window.location.href = '/home'; }, 1500);
  };

  if (checkingPreferences || stepsLoading || isRedirecting || !currentStep) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.curatingSpinner}><BookOpen size={48} color="white" /></div>
        <h2 className={styles.curatingTitle}>{isRedirecting ? 'Curating Your Experience' : 'Loading...'}</h2>
      </div>
    );
  }

  return (
    <div className={styles.onboardingPage}>
      <header className={styles.header}>
        <span className={styles.logoText}>StackAcademy</span>
        <button onClick={handleSkip} className={styles.skipBtn}>Skip for now</button>
      </header>

      <main className={styles.content}>
        <div className={styles.stepContent}>
          <h1>{currentStep.question}</h1>
          <div className={styles.optionsGrid}>
            {currentStep.options.map((opt) => (
              <button 
                key={opt.id} 
                className={`${styles.optionCard} ${(selections[currentStepIndex] || []).includes(opt.id) ? styles.selected : ''}`}
                onClick={() => handleSelect(opt.id)}
              >
                <span>{opt.label}</span>
                {(selections[currentStepIndex] || []).includes(opt.id) && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <button onClick={() => setCurrentStepIndex(i => i - 1)} disabled={currentStepIndex === 0}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext} disabled={(selections[currentStepIndex] || []).length === 0}>
          {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={20} />
        </button>
      </footer>
    </div>
  );
}

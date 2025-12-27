'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Rocket,
  Shuffle,
  TrendingUp,
  Glasses,
  Zap,
  Cpu,
  Layers,
  Code,
  BarChart2,
  Palette,
  Shield,
  Cloud,
  GitBranch,
  Briefcase,
  Book,
  Award,
  GraduationCap,
  Terminal,
  Globe,
  Smartphone,
  Clock,
  LucideIcon,
} from 'lucide-react';
import styles from './onboarding.module.css';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// Comprehensive icon map
const iconMap: Record<string, LucideIcon> = {
  'rocket': Rocket,
  'shuffle': Shuffle,
  'trending-up': TrendingUp,
  'glasses': Glasses,
  'zap': Zap,
  'cpu': Cpu,
  'layers': Layers,
  'code': Code,
  'bar-chart-2': BarChart2,
  'palette': Palette,
  'shield': Shield,
  'cloud': Cloud,
  'git-branch': GitBranch,
  'briefcase': Briefcase,
  'book': Book,
  'book-open': BookOpen,
  'award': Award,
  'graduation-cap': GraduationCap,
  'terminal': Terminal,
  'globe': Globe,
  'smartphone': Smartphone,
  'clock': Clock,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { savePreferences, hasCompletedOnboarding, loading: prefsLoading, refetch } = useUserPreferences();
  const { steps, isLoading } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if not authenticated or if user profile doesn't exist
  useEffect(() => {
    if (!authLoading && (!user || !user.profile)) {
      router.push('/login');
    }
  }, [user, user?.profile, authLoading, router]);

  // Redirect if already completed onboarding
  useEffect(() => {
    if (!prefsLoading && !authLoading && hasCompletedOnboarding()) {
      router.push('/home');
    }
  }, [prefsLoading, authLoading, hasCompletedOnboarding, router]);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length || 5;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!currentStep) return [];
    if (!searchQuery.trim()) return currentStep.options;
    
    const query = searchQuery.toLowerCase();
    return currentStep.options.filter(opt => 
      opt.label.toLowerCase().includes(query) || 
      opt.description.toLowerCase().includes(query)
    );
  }, [currentStep, searchQuery]);

  const handleSelect = (optionId: string) => {
    const stepNum = currentStepIndex;
    const currentSelections = selections[stepNum] || [];
    
    // For most steps, allow single selection. For topics, allow multiple
    if (currentStepIndex === 3) {
      // Step 4: Topics - allow multiple selections
      if (currentSelections.includes(optionId)) {
        setSelections({
          ...selections,
          [stepNum]: currentSelections.filter(id => id !== optionId),
        });
      } else {
        setSelections({
          ...selections,
          [stepNum]: [...currentSelections, optionId],
        });
      }
    } else {
      // Single selection for other steps
      setSelections({
        ...selections,
        [stepNum]: [optionId],
      });
    }
  };

  const isSelected = (optionId: string) => {
    return (selections[currentStepIndex] || []).includes(optionId);
  };

  const canProceed = (selections[currentStepIndex] || []).length > 0;

  const handleNext = async () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setSearchQuery('');
    } else {
      // Save preferences to Supabase
      await handleSavePreferences();
    }
  };

  // Helper function to get option value from UID
  const getOptionValue = (stepIndex: number, uid: string): string | null => {
    if (!uid || !steps[stepIndex]) return null;
    
    const option = steps[stepIndex].options.find(opt => opt.id === uid);
    if (!option) return null;
    
    // For schedule (step 4, index 4), extract number from label
    // The schedule field should be a string like "5", "15", "30", "60"
    // The database trigger will convert it to daily_goal_minutes integer
    if (stepIndex === 4) {
      // Extract number from label like "5 minutes" or "15 minutes" -> "5" or "15"
      const match = option.label.match(/\d+/);
      if (match) {
        return match[0]; // Return just the number as string
      }
      // Fallback: try to extract from description or use a default
      console.warn('Could not extract number from schedule option:', option.label);
      return null;
    }
    
    // For other fields, use the label converted to a slug format
    // or use the id if it's already a valid value (not a Contentstack UID)
    if (uid.startsWith('blt')) {
      // It's a Contentstack UID, use the label converted to slug
      return option.label.toLowerCase().replace(/\s+/g, '-');
    }
    
    // Already a valid value, use as is
    return uid;
  };

  // Helper function to get topic values
  const getTopicValues = (uids: string[]): string[] => {
    if (!uids || uids.length === 0 || !steps[3]) return [];
    
    return uids
      .map(uid => {
        const option = steps[3].options.find(opt => opt.id === uid);
        if (!option) return null;
        
        // If it's a Contentstack UID, use label as slug
        if (uid.startsWith('blt')) {
          return option.label.toLowerCase().replace(/\s+/g, '-');
        }
        return uid;
      })
      .filter((val): val is string => val !== null);
  };

  const handleSavePreferences = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsSaving(true);
    try {
      // Map UIDs to actual values
      console.log('Mapping selections to values. Selections:', selections);
      console.log('Available steps:', steps.map(s => ({ step: s.stepNumber, options: s.options.length })));
      
      const goalValue = selections[0]?.[0] ? getOptionValue(0, selections[0][0]) : null;
      const roleValue = selections[1]?.[0] ? getOptionValue(1, selections[1][0]) : null;
      const educationValue = selections[2]?.[0] ? getOptionValue(2, selections[2][0]) : null;
      const topicsValue = selections[3] ? getTopicValues(selections[3]) : [];
      const scheduleValue = selections[4]?.[0] ? getOptionValue(4, selections[4][0]) : null;

      console.log('Mapped values:', {
        goal: goalValue,
        role: roleValue,
        education: educationValue,
        topics: topicsValue,
        schedule: scheduleValue,
      });

      // Validate schedule is a number string (for database trigger)
      // The database trigger converts schedule TEXT to daily_goal_minutes INTEGER
      let validatedSchedule = scheduleValue;
      if (validatedSchedule) {
        // Check if it's still a Contentstack UID (shouldn't happen, but safety check)
        if (validatedSchedule.startsWith('blt')) {
          console.error('Schedule value is still a UID! Extracting from option label...');
          const scheduleOption = steps[4]?.options.find(opt => opt.id === selections[4]?.[0]);
          if (scheduleOption) {
            const numMatch = scheduleOption.label.match(/\d+/);
            validatedSchedule = numMatch ? numMatch[0] : null;
          } else {
            validatedSchedule = null;
          }
        } else if (!/^\d+$/.test(validatedSchedule)) {
          // If it's not a pure number, try to extract it
          console.warn('Schedule value is not a pure number, extracting:', validatedSchedule);
          const numMatch = validatedSchedule.match(/\d+/);
          validatedSchedule = numMatch ? numMatch[0] : null;
        }
      }

      const preferences = {
        goal: goalValue,
        role: roleValue,
        education: educationValue,
        topics: topicsValue,
        schedule: validatedSchedule, // Must be a number string like "5", "15", "30", "60" or null
      };

      console.log('Final preferences to save:', preferences);

      // Mark as completed when user finishes onboarding
      await savePreferences(preferences, true);
      
      // Stop saving state first
      setIsSaving(false);
      
      // Set redirecting state immediately - this will trigger re-render
      setIsRedirecting(true);
      
      // Use double requestAnimationFrame to ensure DOM update happens
      // This ensures the animation component renders before we redirect
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Wait to show the animation before redirecting (2.5 seconds)
          setTimeout(() => {
            window.location.href = '/home';
          }, 2500);
        });
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      setIsSaving(false);
      setIsRedirecting(false);
      alert(`Failed to save preferences: ${error.message || 'Please try again.'}`);
    }
  };

  const handleSkip = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Don't save anything - just show loading animation and redirect to home
    // User will be asked for preferences again on next login
    setIsRedirecting(true);
    
    // Wait a bit to show the animation before redirecting
    setTimeout(() => {
      window.location.href = '/home';
    }, 1500);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setSearchQuery('');
    }
  };

  if (isLoading || authLoading || prefsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Preparing your personalized experience...</p>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className={styles.loadingContainer} style={{ zIndex: 9999 }}>
        <div className={styles.curatingSpinner}>
          <div className={styles.curatingIcon}>
            <BookOpen size={48} style={{ color: 'white', opacity: 1 }} />
          </div>
          <div className={styles.curatingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <h2 className={styles.curatingTitle}>Curating Content</h2>
        <p className={styles.curatingSubtitle}>According to your preferences...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (!currentStep) {
    return (
      <div className={styles.errorContainer}>
        <p>Unable to load onboarding. Please try again.</p>
        <button onClick={() => router.push('/home')} className={styles.skipBtn}>
          Skip to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.onboardingPage}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <BookOpen size={24} />
          </div>
          <span className={styles.logoText}>StackAcademy</span>
        </Link>
        <button 
          onClick={handleSkip} 
          className={styles.skipBtn}
          disabled={isRedirecting}
        >
          {isRedirecting ? 'Redirecting...' : 'Skip for now'}
        </button>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <span className={styles.progressText}>
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Main Content */}
      <main className={styles.content}>
        <div className={styles.stepContent}>
          <h1 className={styles.question}>{currentStep.question}</h1>
          
          {currentStepIndex === 3 ? (
            <p className={styles.subtitle}>Select all topics that interest you</p>
          ) : (
            <p className={styles.subtitle}>Choose the option that best describes you</p>
          )}

          {/* Search Bar for Searchable Grid */}
          {currentStep.displayType === 'Searchable Grid' && (
            <div className={styles.searchWrapper}>
              <Search size={20} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          )}

          {/* Options Grid */}
          <div className={`${styles.optionsGrid} ${currentStep.displayType === 'Card Grid' ? styles.cardGrid : styles.searchableGrid}`}>
            {filteredOptions.map((option) => {
              const IconComponent = iconMap[option.iconName] || Zap;
              const selected = isSelected(option.id);
              
              return (
                <button
                  key={option.id}
                  className={`${styles.optionCard} ${selected ? styles.selected : ''}`}
                  onClick={() => handleSelect(option.id)}
                >
                  <div className={styles.optionIconWrapper}>
                    <IconComponent size={28} style={{ color: 'white', opacity: 1 }} />
                  </div>
                  <div className={styles.optionContent}>
                    <span className={styles.optionLabel}>{option.label}</span>
                    {option.description && (
                      <span className={styles.optionDescription}>{option.description}</span>
                    )}
                  </div>
                  {selected && (
                    <div className={styles.checkmark}>
                      <Check size={16} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {filteredOptions.length === 0 && searchQuery && (
            <p className={styles.noResults}>No results found for &quot;{searchQuery}&quot;</p>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className={styles.footer}>
        <button
          className={styles.backBtn}
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft size={20} />
          {currentStep.backButtonText}
        </button>
        
        <button
          className={styles.nextBtn}
          onClick={handleNext}
          disabled={!canProceed || isSaving}
        >
          {isSaving ? 'Saving...' : currentStep.nextButtonText}
          <ArrowRight size={20} />
        </button>
      </footer>
    </div>
  );
}

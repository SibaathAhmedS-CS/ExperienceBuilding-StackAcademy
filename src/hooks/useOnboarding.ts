'use client';

import { useState, useEffect } from 'react';
import { getAllOnboardingSteps } from '@/lib/contentstack';
import { OnboardingBlockEntry, extractOnboardingOptions, IconEntry } from '@/types/contentstack';

export interface OnboardingStep {
  stepNumber: number;
  totalSteps: number;
  question: string;
  displayType: 'Card Grid' | 'Searchable Grid';
  options: {
    id: string;
    label: string;
    description: string;
    iconName: string;
  }[];
  backButtonText: string;
  nextButtonText: string;
}

// Fallback data in case CMS is unavailable
const fallbackSteps: OnboardingStep[] = [
  {
    stepNumber: 1,
    totalSteps: 5,
    question: 'What brings you to StackAcademy?',
    displayType: 'Card Grid',
    options: [
      { id: 'start-career', label: 'Start my career', description: 'Start a new career path', iconName: 'rocket' },
      { id: 'change-career', label: 'Change my career', description: 'Transition to a new field', iconName: 'shuffle' },
      { id: 'grow-role', label: 'Grow in my current role', description: 'Advance in my current job', iconName: 'trending-up' },
      { id: 'personal', label: 'Explore for fun', description: 'Learn for personal interest', iconName: 'glasses' },
    ],
    backButtonText: 'Back',
    nextButtonText: 'Continue',
  },
];

function transformStep(entry: OnboardingBlockEntry): OnboardingStep {
  const options = extractOnboardingOptions(entry.option);
  
  return {
    stepNumber: entry.current_step,
    totalSteps: entry.total_steps,
    question: entry.label_text,
    displayType: entry.display_type,
    options: options.map((opt: IconEntry) => ({
      id: opt.uid,
      label: opt.icon_title || opt.title,
      description: opt.description || '',
      iconName: opt.icon_name || 'circle',
    })),
    backButtonText: entry.back_button_text || 'Back',
    nextButtonText: entry.next_button_text || 'Continue',
  };
}

export function useOnboarding() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCMSData, setHasCMSData] = useState(false);

  useEffect(() => {
    async function fetchSteps() {
      try {
        const data = await getAllOnboardingSteps();
        console.log('[Onboarding] Fetched data:', data);
        console.log('[Onboarding] Number of steps:', data?.length);
        
        if (data && data.length > 0) {
          const transformedSteps = data.map(transformStep);
          // Sort by stepNumber to ensure correct order
          transformedSteps.sort((a, b) => a.stepNumber - b.stepNumber);
          console.log('[Onboarding] Transformed steps:', transformedSteps);
          setSteps(transformedSteps);
          setHasCMSData(true);
        } else {
          console.warn('[Onboarding] No CMS data found, using fallback');
          setSteps(fallbackSteps);
          setHasCMSData(false);
        }
      } catch (error) {
        console.error('Failed to fetch onboarding steps from CMS:', error);
        setSteps(fallbackSteps);
        setHasCMSData(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSteps();
  }, []);

  return { steps, isLoading, hasCMSData };
}


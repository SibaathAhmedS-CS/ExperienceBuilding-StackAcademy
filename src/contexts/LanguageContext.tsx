'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  isLanguageLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const DEFAULT_LANGUAGE = 'en-us';

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start with default, will update from localStorage on client mount
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  // Load language from localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedLanguage');
    if (stored) {
      setSelectedLanguageState(stored);
    }
    setIsLanguageLoaded(true);
  }, []);

  const setSelectedLanguage = (language: string) => {
    // First save to localStorage
    localStorage.setItem('selectedLanguage', language);
    // Update state (this triggers re-renders with new language)
    setSelectedLanguageState(language);
    // Note: No page reload needed - hooks will refetch with new language due to dependency
  };

  // Don't render children until language is loaded from localStorage
  // This prevents initial fetch with wrong language
  if (!isLanguageLoaded) {
    return null; // Or a loading spinner if preferred
  }

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage, isLanguageLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Get current locale - can be used in server components or API calls
 */
export function getCurrentLocale(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedLanguage') || DEFAULT_LANGUAGE;
  }
  return DEFAULT_LANGUAGE;
}

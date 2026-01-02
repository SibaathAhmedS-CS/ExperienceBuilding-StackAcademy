'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const DEFAULT_LANGUAGE = 'en-us';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedLanguage');
    if (stored) {
      setSelectedLanguageState(stored);
    }
  }, []);

  const setSelectedLanguage = (language: string) => {
    setSelectedLanguageState(language);
    localStorage.setItem('selectedLanguage', language);
    // Reload page to apply language change - all content will fetch with new locale
    window.location.reload();
  };

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage }}>
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

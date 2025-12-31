'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  supportedLanguages: { code: string; name: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language mapping
const LANGUAGE_MAP: Record<string, string> = {
  'ta-in': 'Tamil - India',
  'fr-us': 'French - United States',
  'es': 'Spanish',
  'en-us': 'English - United States', // Default
};

const DEFAULT_LANGUAGE = 'en-us';

export function LanguageProvider({ children, supportedLanguages = [] }: { children: ReactNode; supportedLanguages?: string[] }) {
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(DEFAULT_LANGUAGE);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(supportedLanguages);

  // Update available languages when prop changes
  useEffect(() => {
    if (supportedLanguages.length > 0) {
      setAvailableLanguages(supportedLanguages);
    }
  }, [supportedLanguages]);

  // Load language from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedLanguage');
    if (stored && (availableLanguages.length === 0 || availableLanguages.includes(stored))) {
      setSelectedLanguageState(stored);
    }
  }, [availableLanguages]);

  const setSelectedLanguage = (language: string) => {
    setSelectedLanguageState(language);
    localStorage.setItem('selectedLanguage', language);
    // Reload page to apply language change
    window.location.reload();
  };

  // Convert language codes to display format
  const languageOptions = availableLanguages.length > 0
    ? availableLanguages.map(code => ({
        code,
        name: LANGUAGE_MAP[code] || code,
      }))
    : [
        { code: 'en-us', name: 'English - United States' },
        { code: 'ta-in', name: 'Tamil - India' },
        { code: 'fr-us', name: 'French - United States' },
        { code: 'es', name: 'Spanish' },
      ];

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage, supportedLanguages: languageOptions }}>
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


'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  // Default supported languages (will be filtered by Header component based on CMS data)
  const defaultLanguages = ['en-us', 'ta-in', 'fr-us', 'es'];
  
  return (
    <LanguageProvider supportedLanguages={defaultLanguages}>
      {children}
    </LanguageProvider>
  );
}


'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default supported languages (will be overridden by headerData when Header mounts)
  const defaultLanguages = ['en-us', 'ta-in', 'fr-us', 'es'];
  
  return (
    <LanguageProvider supportedLanguages={defaultLanguages}>
      {children}
    </LanguageProvider>
  );
}

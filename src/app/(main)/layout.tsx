'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}

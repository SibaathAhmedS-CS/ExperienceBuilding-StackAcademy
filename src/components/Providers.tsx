'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import LivePreviewInitComponent from '@/components/LivePreviewInitComponent';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LivePreviewInitComponent />
      {children}
    </LanguageProvider>
  );
}

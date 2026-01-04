'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { LyticsProvider } from '@/components/LyticsProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LyticsProvider>
        {children}
      </LyticsProvider>
    </LanguageProvider>
  );
}

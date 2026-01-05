import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/Providers';
import Script from 'next/script';
import './globals.css';
// Import check functions for debugging
import '@/lib/checkPersonalizeConfig';
import '@/lib/checkCookies';

export const metadata: Metadata = {
  title: 'StackAcademy - Learn New Skills Everyday',
  description: 'Master in-demand skills with expert-led courses. Join 5000+ students learning technology, business, and creative skills.',
  keywords: ['e-learning', 'online courses', 'programming', 'development', 'skills'],
  authors: [{ name: 'StackAcademy' }],
  openGraph: {
    title: 'StackAcademy - Learn New Skills Everyday',
    description: 'Master in-demand skills with expert-led courses.',
    type: 'website',
  },
};

// Get Lytics Account ID from environment
const LYTICS_ACCOUNT_ID = process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID || '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">

      <body>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}


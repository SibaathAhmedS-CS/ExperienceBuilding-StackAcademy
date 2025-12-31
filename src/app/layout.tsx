import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/Providers';
import './globals.css';

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


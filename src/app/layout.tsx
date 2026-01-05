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
      <head>
        {/* Lytics Tracking Tag - Added to layout for all pages */}
        {LYTICS_ACCOUNT_ID && (
          <Script
            id="lytics-tag"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                <!-- Start Lytics Tracking Tag Version 3 -->
                !function(){"use strict";var o=window.jstag||(window.jstag={}),r=[];function n(e){o[e]=function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];r.push([e,t])}}n("send"),n("mock"),n("identify"),n("pageView"),n("unblock"),n("getid"),n("setid"),n("loadEntity"),n("getEntity"),n("on"),n("once"),n("call"),o.loadScript=function(n,t,i){var e=document.createElement("script");e.async=!0,e.src=n,e.onload=t,e.onerror=i;var o=document.getElementsByTagName("script")[0],r=o&&o.parentNode||document.head||document.body,c=o||r.lastChild;return null!=c?r.insertBefore(e,c):r.appendChild(e),this},o.init=function n(t){return this.config=t,this.loadScript(t.src,function(){if(o.init===n)throw new Error("Load error!");o.init(o.config),function(){for(var n=0;n<r.length;n++){var t=r[n][0],i=r[n][1];o[t].apply(o,i)}r=void 0}()}),this}}();
                // Define config and initialize Lytics tracking tag.
                jstag.init({
                  src: 'https://c.lytics.io/api/tag/${LYTICS_ACCOUNT_ID}/latest.min.js'
                });
                // You may need to send a page view, depending on your use-case
                jstag.pageView();
                console.log("[Lytics] 📡 Script loaded from layout.tsx with account: ${LYTICS_ACCOUNT_ID.substring(0, 8)}...");
              `,
            }}
          />
        )}
      </head>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}


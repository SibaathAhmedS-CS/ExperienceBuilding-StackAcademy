'use client';

import { Toaster } from 'react-hot-toast';
import { Providers } from '@/components/Providers';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en">
      <head>
        {/* Favicon - Stack Academy Logo */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        {/* Start Lytics Tracking Tag Version 3 */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
!function(){"use strict";var o=window.jstag||(window.jstag={}),r=[];function n(e){o[e]=function(){for(var n=arguments.length,t=new Array(n),i=0;i<n;i++)t[i]=arguments[i];r.push([e,t])}}n("send"),n("mock"),n("identify"),n("pageView"),n("unblock"),n("getid"),n("setid"),n("loadEntity"),n("getEntity"),n("on"),n("once"),n("call"),o.loadScript=function(n,t,i){var e=document.createElement("script");e.async=!0,e.src=n,e.onload=function(){console.log('[Lytics] ✅ Script loaded successfully:', n);if(t)t()},e.onerror=function(){console.error('[Lytics] ❌ Script failed to load:', n);if(i)i()};var o=document.getElementsByTagName("script")[0],r=o&&o.parentNode||document.head||document.body,c=o||r.lastChild;return null!=c?r.insertBefore(e,c):r.appendChild(e),this},o.init=function n(t){console.log('[Lytics] 🚀 Initializing Lytics with config:', t);return this.config=t,this.loadScript(t.src,function(){if(o.init===n)throw new Error("Load error!");console.log('[Lytics] ✅ Lytics SDK initialized successfully');o.init(o.config),function(){for(var n=0;n<r.length;n++){var t=r[n][0],i=r[n][1];o[t].apply(o,i)}r=void 0}()}),this}}();
// Define config and initialize Lytics tracking tag.
console.log('[Lytics] 📝 Starting Lytics initialization...');
jstag.init({
  src: 'https://c.lytics.io/api/tag/14d49cecb3cbd62980949338e799553f/latest.min.js'
});

// Monitor localStorage for lytics_anonymous_id changes
(function() {
  var originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    if (key === 'lytics_anonymous_id') {
      console.log('[Lytics] 🔍 lytics_anonymous_id is being SET:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Value:', value);
      console.log('Stack Trace:', new Error().stack);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    return originalSetItem.apply(this, arguments);
  };
})();

// Override jstag.send to log all events
var originalSend = jstag.send;
jstag.send = function(data) {
  console.log('[Lytics] 📤 Sending event to Lytics:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Event Type:', data._e || 'unknown');
  console.log('Full Data:', JSON.stringify(data, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  var result = originalSend.apply(this, arguments);
  
  // For identify events, log that audience processing will happen
  if (data._e === 'identify') {
    console.log('[Lytics] 👤 Identify event sent - audience processing will begin...');
    console.log('[Lytics] ⏳ Waiting for Lytics to process audience segments...');
  }
  
  return result;
};

// Set up event listeners for segment updates
function setupLyticsListeners() {
  if (typeof jstag === 'undefined' || !jstag.on) {
    console.log('[Lytics] ⏳ Waiting for jstag.on() to be available...');
    setTimeout(setupLyticsListeners, 100);
    return;
  }

  console.log('[Lytics] 🎯 Setting up segment event listeners...');
  
  // Listen for segment updates
  jstag.on('segments', function(segments) {
    console.log('[Lytics] 🎯 Segments updated via event:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Segments:', JSON.stringify(segments, null, 2));
    console.log('Timestamp:', new Date().toISOString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Dispatch custom event for React components to listen to
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('lytics:segmentsUpdated', {
        detail: { segments: segments }
      }));
    }
  });

  // Listen for profile updates (may include segment changes)
  jstag.on('profile', function(profile) {
    console.log('[Lytics] 👤 Profile updated:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Profile:', JSON.stringify(profile, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check for segments in cs-lytics-audiences cookie
    var csAudiencesCookie = document.cookie.split('; ').find(function(row) {
      return row.startsWith('cs-lytics-audiences=');
    });
    if (csAudiencesCookie) {
      try {
        var cookieValue = csAudiencesCookie.split('=')[1];
        var segmentArray = [];
        
        if (cookieValue) {
          // Handle pipe-delimited format: |segment1|segment2|segment3|
          if (cookieValue.startsWith('|') && cookieValue.endsWith('|')) {
            segmentArray = cookieValue
              .split('|')
              .map(function(s) { return s.trim(); })
              .filter(function(s) { return s.length > 0; });
          } else {
            // Try parsing as JSON or comma-separated
            try {
              var parsed = JSON.parse(decodeURIComponent(cookieValue));
              if (Array.isArray(parsed)) {
                segmentArray = parsed.filter(Boolean);
              } else if (typeof parsed === 'string') {
                if (parsed.includes('|')) {
                  segmentArray = parsed.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
                } else {
                  segmentArray = parsed.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                }
              }
            } catch {
              if (cookieValue.includes('|')) {
                segmentArray = cookieValue.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
              } else {
                segmentArray = cookieValue.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
              }
            }
          }
        }
        
      if (segmentArray.length > 0) {
          console.log('[Lytics] 🍪 Segments from cs-lytics-audiences cookie after profile update:', JSON.stringify(segmentArray, null, 2));
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('lytics:segmentsUpdated', {
            detail: { segments: segmentArray }
          }));
        }
        }
      } catch (error) {
        console.warn('[Lytics] ⚠️ Error parsing cs-lytics-audiences cookie:', error);
      }
    }
  });

  console.log('[Lytics] ✅ Segment event listeners registered');
}

// Monitor cookie changes for cs-lytics-audiences
function setupCookieMonitor() {
  var lastCookieValue = '';
  
  function getSegmentsFromCookie() {
    var csAudiencesCookie = document.cookie.split('; ').find(function(row) {
      return row.startsWith('cs-lytics-audiences=');
    });
    if (csAudiencesCookie) {
      try {
        var cookieValue = csAudiencesCookie.split('=')[1];
        if (cookieValue) {
          // Handle pipe-delimited format: |segment1|segment2|segment3|
          if (cookieValue.startsWith('|') && cookieValue.endsWith('|')) {
            return cookieValue
              .split('|')
              .map(function(s) { return s.trim(); })
              .filter(function(s) { return s.length > 0; });
          }
          
          // Try parsing as JSON or comma-separated
          try {
            var parsed = JSON.parse(decodeURIComponent(cookieValue));
            if (Array.isArray(parsed)) {
              return parsed.filter(Boolean);
            } else if (typeof parsed === 'string') {
              if (parsed.includes('|')) {
                return parsed.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
              }
              return parsed.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
            }
          } catch {
            if (cookieValue.includes('|')) {
              return cookieValue.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
            }
            return cookieValue.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
          }
        }
      } catch (error) {
        console.warn('[Lytics] ⚠️ Error parsing cs-lytics-audiences cookie:', error);
      }
    }
    return [];
  }
  
  function checkCookie() {
    var currentSegments = getSegmentsFromCookie();
    var currentCookieValue = currentSegments.join(',');
    
    if (currentCookieValue !== lastCookieValue && currentCookieValue !== '') {
      console.log('[Lytics] 🍪 Cookie changed! Segments updated:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Previous:', lastCookieValue || '(empty)');
      console.log('Current:', JSON.stringify(currentSegments, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lastCookieValue = currentCookieValue;
      
      // Dispatch custom event
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('lytics:segmentsUpdated', {
          detail: { segments: currentSegments }
        }));
      }
    }
  }
  
  // Check cookie every 500ms
  setInterval(checkCookie, 500);
  
  // Also listen for storage events (cross-tab)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function(e) {
      if (e.key === 'cs-lytics-audiences' || e.key === null) {
        checkCookie();
      }
    });
  }
  
  console.log('[Lytics] ✅ Cookie monitor initialized');
}

// Clear old lytics_cookies_cleared from localStorage/sessionStorage (no longer needed)
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('lytics_cookies_cleared');
    sessionStorage.removeItem('lytics_cookies_cleared');
    console.log('[Lytics] 🗑️ Removed old lytics_cookies_cleared from storage');
  } catch (e) {
    // Ignore errors
  }
}

// Initialize listeners after Lytics loads
setTimeout(function() {
  setupLyticsListeners();
  setupCookieMonitor();
}, 2000);

// You may need to send a page view, depending on your use-case
jstag.pageView();
            `,
          }}
        />
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


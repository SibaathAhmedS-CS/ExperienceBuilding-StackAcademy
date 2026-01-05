/**
 * Utility to check all cookies including domain-specific ones
 * Helps debug why there might be multiple seerid cookies
 */

/**
 * Check all cookies including their domains
 * Note: document.cookie only shows cookies for current domain
 * To see cookies from other domains, check browser DevTools → Application → Cookies
 */
export function checkAllCookies(): void {
  if (typeof document === 'undefined') {
    console.warn('[Cookie Check] Can only run in browser');
    return;
  }

  console.log('=== COOKIE ANALYSIS ===');
  console.log('Current domain:', window.location.hostname);
  console.log('Current origin:', window.location.origin);
  
  // Get all cookies visible to current domain
  const cookies = document.cookie.split(';').map(c => c.trim());
  
  console.log('\n📋 All cookies for current domain:');
  if (cookies.length === 0 || (cookies.length === 1 && cookies[0] === '')) {
    console.log('   No cookies found');
  } else {
    cookies.forEach((cookie, index) => {
      const [name, value] = cookie.split('=');
      console.log(`   ${index + 1}. ${name}: ${value ? value.substring(0, 30) + (value.length > 30 ? '...' : '') : '(empty)'}`);
    });
  }
  
  // Check for seerid cookies specifically
  const seeridCookies = cookies.filter(c => c.startsWith('seerid='));
  console.log(`\n🔍 seerid cookies found: ${seeridCookies.length}`);
  
  if (seeridCookies.length > 1) {
    console.warn('⚠️ MULTIPLE SEERID COOKIES DETECTED!');
    console.warn('This can cause issues with Personalize SDK.');
    console.warn('\nPossible reasons:');
    console.warn('1. Cookies set on different domains:');
    console.warn('   - localhost (current domain)');
    console.warn('   - .lytics.io (Lytics domain)');
    console.warn('   - Other subdomains');
    console.warn('\n2. Multiple Lytics instances:');
    console.warn('   - Script loaded multiple times');
    console.warn('   - Different account IDs');
    console.warn('\n3. Cookie domain configuration:');
    console.warn('   - Lytics might be setting cookies on .lytics.io domain');
    console.warn('   - While also setting on localhost');
    console.warn('\n💡 Solution:');
    console.warn('   - Check browser DevTools → Application → Cookies');
    console.warn('   - Look at the "Domain" column for each seerid cookie');
    console.warn('   - Personalize SDK should use the one from current domain (localhost)');
    
    seeridCookies.forEach((cookie, index) => {
      const value = cookie.split('=')[1];
      console.log(`\n   seerid ${index + 1}: ${value}`);
    });
  } else if (seeridCookies.length === 1) {
    const value = seeridCookies[0].split('=')[1];
    console.log(`✅ Single seerid cookie: ${value.substring(0, 20)}...`);
    console.log('   This is correct - only one seerid should exist');
  } else {
    console.warn('❌ No seerid cookie found');
    console.warn('   Lytics SDK might not have loaded yet');
  }
  
  console.log('\n💡 To see cookies from ALL domains:');
  console.log('   1. Open browser DevTools (F12)');
  console.log('   2. Go to Application tab → Cookies');
  console.log('   3. Expand "http://localhost:3000"');
  console.log('   4. Look for seerid cookies');
  console.log('   5. Check the "Domain" column');
  console.log('\n📝 Cookie Domain Explanation:');
  console.log('   - Domain: localhost → Only visible to localhost');
  console.log('   - Domain: .lytics.io → Visible to all *.lytics.io subdomains');
  console.log('   - Domain: (empty) → Defaults to current domain');
  console.log('========================');
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).checkAllCookies = checkAllCookies;
}


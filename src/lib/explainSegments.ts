/**
 * Explanation: Why "all" and "smt_new" appear in cookies
 * 
 * Lytics has two types of segments:
 * 1. MANAGED SEGMENTS (System-defined, always present):
 *    - "all" - Every user belongs to this segment by default
 *    - "smt_new" - Likely "Smart New" or similar managed segment for new users
 *    - These are automatically set by Lytics and appear immediately
 * 
 * 2. CUSTOM SEGMENTS (User-defined, evaluated based on rules):
 *    - "Ambitious Beginners" - Your custom audience
 *    - "UI Explorers" - Another custom audience
 *    - These require evaluation time and may not appear immediately
 * 
 * The issue: Custom audiences take time to evaluate, but Personalize SDK
 * might read segments before Lytics finishes evaluation, so only managed
 * segments appear in cookies.
 */

/**
 * Check which segments are managed vs custom
 * Run in browser console: window.explainSegments()
 */
export function explainSegments(): void {
  console.log('=== EXPLAINING LYTICS SEGMENTS ===');
  console.log('');
  
  if (typeof window === 'undefined' || !window.jstag) {
    console.error('❌ jstag not available');
    return;
  }

  // Get segments from Lytics
  if (typeof window.jstag.getSegments === 'function') {
    window.jstag.getSegments((segments: string[]) => {
      const allSegments = Array.isArray(segments) ? segments : [];
      
      console.log('📊 Current Segments:', allSegments);
      console.log('');
      
      // Common managed segments
      const managedSegments = ['all', 'smt_new', 'anonymous_profiles', 'identified_profiles'];
      const customSegments: string[] = [];
      
      allSegments.forEach(seg => {
        if (managedSegments.includes(seg.toLowerCase())) {
          console.log(`✅ MANAGED SEGMENT: "${seg}"`);
          console.log('   → This is a system-defined segment, always present');
        } else {
          customSegments.push(seg);
          console.log(`🎯 CUSTOM SEGMENT: "${seg}"`);
          console.log('   → This is a user-defined audience, evaluated by Lytics');
        }
      });
      
      console.log('');
      console.log('📋 Summary:');
      console.log(`   - Managed segments: ${allSegments.filter(s => managedSegments.includes(s.toLowerCase())).length}`);
      console.log(`   - Custom segments: ${customSegments.length}`);
      console.log('');
      
      if (customSegments.length === 0) {
        console.log('⚠️ ⚠️ ⚠️ NO CUSTOM SEGMENTS FOUND!');
        console.log('');
        console.log('💡 This means:');
        console.log('   1. Lytics is still evaluating your custom audiences');
        console.log('   2. OR your user attributes don\'t match the audience rules');
        console.log('   3. OR the audience is not published in Lytics');
        console.log('');
        console.log('🔧 Solutions:');
        console.log('   1. Wait 10-15 seconds after identify() call');
        console.log('   2. Call window.refreshLyticsSegments()');
        console.log('   3. Check Lytics Dashboard → User Profiles → Search by email');
        console.log('   4. Verify user attributes match audience rules:');
        console.log('      - goal, role, education, topics, etc.');
        console.log('   5. Ensure audiences are Published (not Draft)');
      } else {
        console.log('✅ Custom segments found! These should appear in cookies.');
        console.log('💡 If they don\'t appear in cookies, Personalize SDK may have read too early.');
        console.log('💡 Solution: Refresh the page or call window.waitForLyticsAndRefreshPersonalize()');
      }
      
      // Check cookies
      console.log('');
      console.log('🍪 Checking cookies...');
      const cookieAudiences = getLyticsAudiencesFromCookies();
      console.log('   Cookie segments:', cookieAudiences);
      
      // Find custom segments missing from cookies
      const missingInCookies = customSegments.filter(seg => !cookieAudiences.includes(seg));
      if (missingInCookies.length > 0) {
        console.log('');
        console.log('⚠️ Custom segments NOT in cookies:', missingInCookies);
        console.log('💡 This means Personalize SDK read segments before Lytics finished evaluation');
        console.log('💡 Solution: Refresh page or call window.waitForLyticsAndRefreshPersonalize()');
      }
    });
  } else {
    console.error('❌ jstag.getSegments() not available');
  }
}

// Import helper function
import { getLyticsAudiencesFromCookies } from './lytics';

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).explainSegments = explainSegments;
}


/**
 * Reload Manager
 * Manages exactly 2 reloads after login to ensure Lytics and Personalize SDK sync properly
 */

const RELOAD_COUNT_KEY = 'login_reload_count';
const RELOAD_TRIGGER_KEY = 'login_reload_trigger';
const MAX_RELOADS = 2;

/**
 * Check if we should trigger reloads after login
 */
export function shouldTriggerReloads(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(RELOAD_TRIGGER_KEY) === 'true';
}

/**
 * Initialize reload tracking after successful login
 */
export function initializeReloadTracking(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RELOAD_TRIGGER_KEY, 'true');
  sessionStorage.setItem(RELOAD_COUNT_KEY, '0');
}

/**
 * Increment reload count and check if we should reload again
 * Returns true if we should reload, false if we're done
 */
export function handleReload(): boolean {
  if (typeof window === 'undefined') return false;
  
  const trigger = sessionStorage.getItem(RELOAD_TRIGGER_KEY);
  if (trigger !== 'true') return false; // Not in reload sequence
  
  const currentCount = parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);
  const newCount = currentCount + 1;
  
  sessionStorage.setItem(RELOAD_COUNT_KEY, newCount.toString());
  
  if (newCount < MAX_RELOADS) {
    // Need more reloads
    return true;
  } else {
    // Done with reloads, clean up
    cleanupReloadTracking();
    return false;
  }
}

/**
 * Clean up reload tracking
 */
export function cleanupReloadTracking(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RELOAD_TRIGGER_KEY);
  sessionStorage.removeItem(RELOAD_COUNT_KEY);
}

/**
 * Get current reload count (for debugging)
 */
export function getReloadCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0', 10);
}


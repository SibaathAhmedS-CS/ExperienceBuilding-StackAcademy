/**
 * Silent Reload Manager
 * Manages exactly 2 silent reloads after home screen loads
 * These reloads happen silently without affecting the user experience
 */

const SILENT_RELOAD_COUNT_KEY = 'home_silent_reload_count';
const SILENT_RELOAD_TRIGGER_KEY = 'home_silent_reload_trigger';
const MAX_SILENT_RELOADS = 2;

/**
 * Initialize silent reload tracking when home screen loads
 */
export function initializeSilentReloadTracking(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SILENT_RELOAD_TRIGGER_KEY, 'true');
  sessionStorage.setItem(SILENT_RELOAD_COUNT_KEY, '0');
}

/**
 * Check if we should trigger silent reloads
 */
export function shouldTriggerSilentReloads(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SILENT_RELOAD_TRIGGER_KEY) === 'true';
}

/**
 * Handle silent reload - increments count and returns true if should reload
 */
export function handleSilentReload(): boolean {
  if (typeof window === 'undefined') return false;
  
  const trigger = sessionStorage.getItem(SILENT_RELOAD_TRIGGER_KEY);
  if (trigger !== 'true') return false;
  
  const currentCount = parseInt(sessionStorage.getItem(SILENT_RELOAD_COUNT_KEY) || '0', 10);
  const newCount = currentCount + 1;
  
  sessionStorage.setItem(SILENT_RELOAD_COUNT_KEY, newCount.toString());
  
  if (newCount < MAX_SILENT_RELOADS) {
    return true; // Need more reloads
  } else {
    // Done with reloads, clean up
    cleanupSilentReloadTracking();
    return false;
  }
}

/**
 * Clean up silent reload tracking
 */
export function cleanupSilentReloadTracking(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SILENT_RELOAD_TRIGGER_KEY);
  sessionStorage.removeItem(SILENT_RELOAD_COUNT_KEY);
}

/**
 * Get current silent reload count (for debugging)
 */
export function getSilentReloadCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(sessionStorage.getItem(SILENT_RELOAD_COUNT_KEY) || '0', 10);
}


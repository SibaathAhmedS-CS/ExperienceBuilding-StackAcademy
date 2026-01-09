/**
 * User Profile Cache Utility
 * Caches user profile data in localStorage for faster access
 */

export interface CachedUserData {
  name: string;
  email: string;
  avatar?: string;
  coursesCompleted: number;
  coursesInProgress: number;
  cachedAt: number; // Timestamp
  userId: string; // To ensure cache matches current user
}

const CACHE_KEY = 'stackacademy_user_profile';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache user profile data
 */
export function cacheUserProfile(userId: string, userData: Omit<CachedUserData, 'cachedAt' | 'userId'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cachedData: CachedUserData = {
      ...userData,
      userId,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
  } catch (error) {
    console.error('Error caching user profile:', error);
  }
}

/**
 * Get cached user profile data
 * Returns null if cache is invalid, expired, or doesn't match current user
 */
export function getCachedUserProfile(userId: string): Omit<CachedUserData, 'cachedAt' | 'userId'> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cachedData: CachedUserData = JSON.parse(cached);
    
    // Check if cache is for the same user
    if (cachedData.userId !== userId) {
      clearUserCache();
      return null;
    }
    
    // Check if cache is expired
    const now = Date.now();
    if (now - cachedData.cachedAt > CACHE_DURATION) {
      clearUserCache();
      return null;
    }
    
    // Return cached data without metadata
    const { cachedAt, userId: _, ...userData } = cachedData;
    return userData;
  } catch (error) {
    console.error('Error reading cached user profile:', error);
    clearUserCache();
    return null;
  }
}

/**
 * Clear cached user profile data
 */
export function clearUserCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
}

/**
 * Update specific fields in the cache
 */
export function updateCachedUserProfile(userId: string, updates: Partial<Omit<CachedUserData, 'cachedAt' | 'userId'>>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    
    const cachedData: CachedUserData = JSON.parse(cached);
    
    // Only update if it's for the same user
    if (cachedData.userId !== userId) return;
    
    // Update fields
    const updatedData: CachedUserData = {
      ...cachedData,
      ...updates,
      userId,
      cachedAt: Date.now(), // Refresh cache timestamp
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(updatedData));
  } catch (error) {
    console.error('Error updating cached user profile:', error);
  }
}


// utils/locale.ts
import { NextRequest } from 'next/server';

export type Locale = 'en-us' | 'ta-in' | 'te-in';

export const DEFAULT_LOCALE: Locale = 'en-us';

/**
 * Get locale from cookie
 */
export function getLocaleFromCookie(
  cookies: { get: (name: string) => { value: string } | undefined },
  supportedLocales: Locale[]
): Locale | null {
  const localeCookie = cookies.get('locale');
  if (localeCookie?.value && supportedLocales.includes(localeCookie.value as Locale)) {
    return localeCookie.value as Locale;
  }
  return null;
}

/**
 * Get locale from request (URL path, cookie, or Accept-Language header)
 */
export function getLocaleFromRequest(
  pathname: string,
  cookies: { get: (name: string) => { value: string } | undefined },
  headers: Headers,
  supportedLocales: Locale[]
): Locale {
  // Check URL path first (e.g., /en-us/home, /ta-in/home)
  for (const locale of supportedLocales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }

  // Check cookie
  const localeCookie = getLocaleFromCookie(cookies, supportedLocales);
  if (localeCookie) {
    return localeCookie;
  }

  // Check Accept-Language header
  const acceptLanguage = headers.get('accept-language');
  if (acceptLanguage) {
    for (const locale of supportedLocales) {
      if (acceptLanguage.includes(locale)) {
        return locale;
      }
    }
  }

  return DEFAULT_LOCALE;
}


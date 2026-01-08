import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getLocaleFromRequest, getLocaleFromCookie, DEFAULT_LOCALE, type Locale } from '@/utils/locale';

// Known supported locales (can be fetched from API, but for middleware we need a static list)
const SUPPORTED_LOCALES: Locale[] = ['en-us', 'ta-in', 'te-in'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup')
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')
  const isHomePage = request.nextUrl.pathname.startsWith('/home')
  const isLandingPage = request.nextUrl.pathname === '/'

  // CASE 2: User is authenticated
  if (user) {
    // Check if preferences exist (any row means user has been to onboarding)
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Check if user skipped onboarding in this session
    const skippedOnboarding = request.cookies.get('skipped_onboarding')?.value === 'true'

    // If authenticated user tries to access landing page, redirect to home
    if (isLandingPage && prefs) {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    // If authenticated user without preferences tries to access landing page, redirect to onboarding
    if (isLandingPage && !prefs) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // If preferences exist (regardless of completed_at), redirect to home if trying to access onboarding
    if (prefs && isOnboardingPage) {
      return NextResponse.redirect(new URL('/home', request.url))
    }

    // If preferences don't exist, redirect to onboarding if trying to access home
    // UNLESS user skipped onboarding in this session (allow temporary access)
    if (!prefs && isHomePage && !skippedOnboarding) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  } else {
    // CASE 1: No session - redirect protected pages to login
    if (isHomePage || isOnboardingPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Detect locale from cookie (set by language switcher) or fallback to header/URL
  // Priority: Cookie > URL > Header > Default
  let locale = getLocaleFromCookie(request.cookies, SUPPORTED_LOCALES);
  
  // Fallback to URL/header detection if no cookie
  if (!locale) {
    locale = getLocaleFromRequest(
      request.nextUrl.pathname,
      request.cookies,
      request.headers,
      SUPPORTED_LOCALES
    );
  }

  // Set locale cookie and header
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  response.headers.set('x-locale', locale);

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

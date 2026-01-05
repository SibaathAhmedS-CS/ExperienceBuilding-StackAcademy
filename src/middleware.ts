import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
// @ts-ignore - Package is installed
import Personalize from '@contentstack/personalize-edge-sdk';
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

  // Contentstack Personalize SDK Integration
  // Only run in development (local testing)
  // On Launch, the edge function handles this
  if (process.env.NODE_ENV === 'development') {
    const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;
    
    if (projectUid) {
      // Skip API routes and static files
      if (
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/favicon.ico')
      ) {
        return response;
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

      try {
        // Set custom edge API URL if provided
        if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
          Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
        }

        // Create a proper Request object for Personalize SDK
        // The SDK expects a Request-like object with Headers that have .get() method
        const headers = new Headers();
        
        // Copy all headers from the original request
        request.headers.forEach((value, key) => {
          headers.set(key, value);
        });
        
        // Add cookies to headers (some SDKs read cookies from Cookie header)
        const cookieString = request.cookies
          .getAll()
          .map(cookie => `${cookie.name}=${cookie.value}`)
          .join('; ');
        if (cookieString) {
          headers.set('Cookie', cookieString);
        }
        
        // Create Request object that the SDK expects
        const personalizeRequest = new Request(request.url, {
          method: request.method,
          headers: headers,
        });
        
        // Initialize Personalize SDK
        const personalizeSdk = await Personalize.init(projectUid, {
          request: personalizeRequest,
        });

        // Get the variant parameter from the SDK
        const variantParam = personalizeSdk.getVariantParam();
        
        // Set locale cookie and header
        response.cookies.set('locale', locale, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        response.headers.set('x-locale', locale);
        
        // Add cookies for visitor identification (needed for next request)
        await personalizeSdk.addStateToResponse(response as any);
        
        // Ensure response is not cached
        response.headers.set('cache-control', 'no-store');
        
        // If variant exists, add it as a header and modify the URL
        if (variantParam) {
          // Set the variant as a header (for server-side access)
          response.headers.set('x-personalize-variant', variantParam);
          
          // Also add to URL by redirecting (this will show in browser URL)
          const url = new URL(request.url);
          url.searchParams.set(Personalize.VARIANT_QUERY_PARAM, variantParam);
          
          // Use rewrite to modify the internal URL without changing browser URL
          const rewriteUrl = new URL(url.pathname + url.search, request.url);
          const rewriteResponse = NextResponse.rewrite(rewriteUrl);
          
          // Set locale cookie and header in rewrite response too
          rewriteResponse.cookies.set('locale', locale, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
          });
          rewriteResponse.headers.set('x-locale', locale);
          
          // Copy cookies and headers
          await personalizeSdk.addStateToResponse(rewriteResponse as any);
          rewriteResponse.headers.set('cache-control', 'no-store');
          rewriteResponse.headers.set('x-personalize-variant', variantParam);
          
          return rewriteResponse;
        }
      } catch (error) {
        console.error('❌ [Middleware] Personalize error:', error);
        // Don't block the request if Personalize fails
        // Still set locale (locale is guaranteed to be defined here)
        response.cookies.set('locale', locale, {
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        response.headers.set('x-locale', locale);
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

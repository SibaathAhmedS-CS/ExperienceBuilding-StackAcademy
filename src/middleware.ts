import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
// @ts-ignore - Package will be installed
import Personalize from '@contentstack/personalize-edge-sdk'

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

  // ============================================
  // CONTENTSTACK PERSONALIZE INTEGRATION
  // ============================================
  const projectUid = process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;

  // Skip Personalize for API routes and static files
  if (
    !projectUid ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico')
  ) {
    return response;
  }

  try {
    // Set custom edge API URL if provided
    if (process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL) {
      Personalize.setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
    }

    // Create Request object for Personalize SDK
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    
    // Add cookies to headers
    const cookieString = request.cookies
      .getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    if (cookieString) {
      headers.set('Cookie', cookieString);
    }
    
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
    
    // Add cookies for visitor identification
    await personalizeSdk.addStateToResponse(response as any);
    
    // Ensure response is not cached
    response.headers.set('cache-control', 'no-store');
    
    // If variant exists, add it as a header and modify the URL
    if (variantParam) {
      response.headers.set('x-personalize-variant', variantParam);
      
      const url = new URL(request.url);
      url.searchParams.set(Personalize.VARIANT_QUERY_PARAM, variantParam);
      
      const rewriteUrl = new URL(url.pathname + url.search, request.url);
      const rewriteResponse = NextResponse.rewrite(rewriteUrl);
      
      // Copy Supabase cookies to rewrite response
      request.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });
      
      await personalizeSdk.addStateToResponse(rewriteResponse as any);
      rewriteResponse.headers.set('cache-control', 'no-store');
      rewriteResponse.headers.set('x-personalize-variant', variantParam);
      
      return rewriteResponse;
    }
    
    return response;
  } catch (error) {
    console.error('❌ [Middleware] Personalize error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

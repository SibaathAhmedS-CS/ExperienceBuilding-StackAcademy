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
  // This runs on every request to determine personalization variant
  // The SDK reads Lytics cookies (seerid, lytics_segments) automatically
  // and queries the Lytics-Contentstack integration for audience memberships

  const projectUid = process.env.NEXT_PUBLIC_PERSONALIZE_PROJECT_UID || 
                     process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID;

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
      (Personalize as any).setEdgeApiUrl(process.env.NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_EDGE_API_URL);
    }

    // Create a proper Request object for Personalize SDK
    // The SDK expects a Request-like object with Headers that have .get() method
    const headers = new Headers();

    // Copy all headers from the original request
    request.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    // Add cookies to headers (IMPORTANT: This includes Lytics cookies like seerid!)
    // The SDK reads these cookies to determine user's Lytics segments
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

    // Initialize Personalize SDK with the request
    // The SDK will:
    // 1. Read Lytics cookies (seerid, lytics_segments) from the request
    // 2. Query the Lytics-Contentstack integration for audience memberships
    // 3. Map Lytics segments to Personalize audiences
    // 4. Determine the appropriate variant
    const personalizeSdk = await Personalize.init(projectUid, {
      request: personalizeRequest,
    } as any);

    // Get the variant parameter from the SDK
    // This is the variant UID (e.g., 'cs_personalize_0_2') that should be used
    // to fetch personalized content from Contentstack
    let variantParam = personalizeSdk.getVariantParam();
    
    // Debug: Log what the SDK returns
    console.log('[Middleware] Personalize SDK getVariantParam():', variantParam);
    
    // If getVariantParam() returns null/empty, try getExperiences() to see what's available
    if (!variantParam) {
      try {
        const experiences = personalizeSdk.getExperiences();
        console.log('[Middleware] Personalize SDK getExperiences():', JSON.stringify(experiences, null, 2));
        
        if (Array.isArray(experiences) && experiences.length > 0) {
          const firstExp = experiences[0];
          console.log('[Middleware] First experience:', {
            shortUid: firstExp.shortUid,
            activeVariantShortUid: firstExp.activeVariantShortUid,
          });
          
          // If activeVariantShortUid exists, build the variant UID
          if (firstExp.activeVariantShortUid !== null && firstExp.activeVariantShortUid !== undefined) {
            variantParam = `cs_personalize_${firstExp.shortUid}_${firstExp.activeVariantShortUid}`;
            console.log('[Middleware] Built variant UID from experience:', variantParam);
          } else {
            console.warn('[Middleware] ⚠️ activeVariantShortUid is null - No variant matched!');
            console.warn('[Middleware] This means user does not belong to any audience with a variant');
          }
        }
      } catch (error) {
        console.error('[Middleware] Error getting experiences:', error);
      }
    }

    // Add SDK state to response (sets cookies for visitor identification)
    // This ensures the SDK can track the user across requests
    await personalizeSdk.addStateToResponse(response as any);

    // Ensure response is not cached (personalization is dynamic)
    response.headers.set('cache-control', 'no-store');

    // If variant exists, add it as a header and modify the URL
    if (variantParam) {
      // Set the variant as a header (for server-side access)
      // Components can read this via: headers.get('x-personalize-variant')
      response.headers.set('x-personalize-variant', variantParam);

      // Also add to URL query parameter (for client-side access)
      // This allows the variant to be accessible in both server and client components
      const url = new URL(request.url);
      const variantQueryParam = (Personalize as any).VARIANT_QUERY_PARAM || 'cs_personalize_variant';
      url.searchParams.set(variantQueryParam, variantParam);

      // Use rewrite to modify the internal URL without changing browser URL
      // This keeps the URL clean while still passing the variant
      const rewriteUrl = new URL(url.pathname + url.search, request.url);
      const rewriteResponse = NextResponse.rewrite(rewriteUrl);

      // Copy all cookies and headers to rewrite response
      await personalizeSdk.addStateToResponse(rewriteResponse as any);
      rewriteResponse.headers.set('cache-control', 'no-store');
      rewriteResponse.headers.set('x-personalize-variant', variantParam);

      // Copy Supabase cookies to rewrite response
      request.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });

      return rewriteResponse;
    } else {
      // No variant found, but still return response with SDK state
      return response;
    }
  } catch (error) {
    // Don't block the request if Personalize fails
    // Log error but continue with normal response
    console.error('[Middleware] Personalize error:', error);
    return response;
  }
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
}

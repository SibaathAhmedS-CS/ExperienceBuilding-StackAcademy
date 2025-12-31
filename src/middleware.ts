import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  return response
}

export const config = {
  matcher: ['/login', '/signup', '/onboarding', '/home'],
}

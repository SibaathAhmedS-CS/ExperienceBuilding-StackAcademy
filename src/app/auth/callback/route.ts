import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  console.log(url);

  const supabase = createClient();

  // Handle OAuth provider errors (user cancelled, access denied, etc.)
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    // Clear any partial session that might exist
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, url)
    );
  }

  // If no code parameter, redirect to login
  if (!code) {
    console.warn('OAuth callback called without code parameter');
    // Clear any partial session
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=no_code', url));
  }

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      // Clear any partial session
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, url)
      );
    }

    if (!data.session) {
      console.warn('No session created after code exchange');
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=no_session', url));
    }

    // Verify user profile exists in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.session.user.id)
      .single();

    // If profile doesn't exist, user was deleted - clear session and redirect to login
    if (profileError || !profile) {
      console.warn('User profile not found in callback, clearing session');
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/login?error=profile_not_found', url));
    }

    // Update last_login_at timestamp in profiles table
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.session.user.id);

    // Check if user has preferences (any row means user has been to onboarding)
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', data.session.user.id)
      .maybeSingle();

    // If preferences exist (regardless of completed_at), redirect to home
    if (prefs) {
      return NextResponse.redirect(new URL('/home', url));
    }

    // If preferences don't exist, redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', url));
  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    // Clear any partial session
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL('/login?error=unexpected_error', url)
    );
  }
}
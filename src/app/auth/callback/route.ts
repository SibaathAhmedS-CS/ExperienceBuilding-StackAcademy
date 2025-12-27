import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/login?error=configuration', requestUrl.origin));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
    }

    if (data.session) {
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
        return NextResponse.redirect(new URL('/login?error=profile_not_found', requestUrl.origin));
      }

      // Check if user has preferences
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('completed_at')
        .eq('user_id', data.session.user.id)
        .single();

      if (prefs && prefs.completed_at) {
        return NextResponse.redirect(new URL('/home', requestUrl.origin));
      }

      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export interface AuthUser extends User {
  profile?: Profile;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (authUser: User) => {
    try {
      // Fetch profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist - user was deleted from database
          // Clear the session since user record doesn't exist
          console.warn('User profile not found, clearing session');
          await supabase.auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        } else {
          // Other errors - log but don't clear session
          console.error('Error loading profile:', error);
          setUser(authUser as AuthUser);
          setLoading(false);
          return;
        }
      }

      // Profile exists - set user with profile
      setUser({
        ...authUser,
        profile: profile || undefined,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(authUser as AuthUser);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  return {
    user,
    loading,
    // Only authenticated if user exists AND has a profile (verified in database)
    isAuthenticated: !!user && !!user.profile,
    signOut,
  };
}


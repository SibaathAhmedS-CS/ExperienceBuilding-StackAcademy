'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, UserPreferences } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useUserPreferences() {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    // Only load preferences if user is authenticated (has both user and profile)
    if (!isAuthenticated || !user?.id || !user?.profile) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
      }

      // Double-check authentication hasn't changed during the request
      if (!isAuthenticated || !user?.profile) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      setPreferences(data || null);
    } catch (error) {
      console.error('Error loading user preferences:', error);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, user?.profile]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = async (prefs: {
    goal?: string | null;
    role?: string | null;
    education?: string | null;
    topics?: string[];
    schedule?: string | null;
  }, markAsCompleted: boolean = true) => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Prepare update data with proper types
      const updateData: any = {
        user_id: user.id,
        goal: prefs.goal ?? null,
        role: prefs.role ?? null,
        education: prefs.education ?? null,
        topics: Array.isArray(prefs.topics) ? prefs.topics : [],
        schedule: prefs.schedule ?? null,
      };

      // Only set completed_at if marking as completed
      if (markAsCompleted) {
        updateData.completed_at = new Date().toISOString();
      } else {
        // For skip, ensure completed_at is null
        updateData.completed_at = null;
      }

      // Don't set daily_goal_minutes - let the database trigger handle it
      // The trigger will convert schedule string to integer

      console.log('Upserting preferences:', updateData);

      // Use upsert - Supabase will handle the unique constraint on user_id automatically
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(updateData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || 'Failed to save preferences');
      }

      if (!data) {
        throw new Error('No data returned from save operation');
      }

      setPreferences(data);
      return data;
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  const hasCompletedOnboarding = () => {
    return preferences !== null && preferences.completed_at !== null;
  };

  const hasPreferencesEntry = () => {
    return preferences !== null;
  };

  return {
    preferences,
    loading,
    savePreferences,
    hasCompletedOnboarding,
    hasPreferencesEntry,
    refetch: loadPreferences,
  };
}


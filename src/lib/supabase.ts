import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  goal: string | null;
  role: string | null;
  education: string | null;
  topics: string[] | null;
  schedule: string | null;
  daily_goal_minutes: number | null;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}


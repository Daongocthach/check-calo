import { env } from '@/config/env';
import type { UserProfile } from '@/features/nutrition/types';
import { supabase } from '@/integrations/supabase';

const SUPABASE_PROFILES_TABLE = 'profiles';

interface SupabaseProfileRow {
  user_id: string;
  display_name: string | null;
  current_streak: number | null;
  completed_goals: number | null;
  updated_at: string;
}

export interface LeaderboardProfile {
  userId: string;
  displayName: string;
  currentStreak: number;
  completedGoals: number;
  updatedAt: string;
}

function hasSupabaseConfiguration() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

async function getAuthenticatedUserId() {
  if (!hasSupabaseConfiguration()) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export async function syncCurrentUserLeaderboardProfile(
  profile: UserProfile,
  currentStreak: number,
  completedGoals: number
) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return false;
  }

  try {
    const { error } = await supabase.from(SUPABASE_PROFILES_TABLE).upsert(
      {
        user_id: userId,
        display_name: profile.displayName.trim(),
        current_streak: normalizeCount(currentStreak),
        completed_goals: normalizeCount(completedGoals),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      if (__DEV__) {
        console.warn('Failed to sync leaderboard profile', error);
      }

      return false;
    }

    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to sync leaderboard profile', error);
    }

    return false;
  }
}

export async function fetchLeaderboardProfiles(limit = 10): Promise<LeaderboardProfile[]> {
  if (!hasSupabaseConfiguration()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(SUPABASE_PROFILES_TABLE)
      .select('user_id, display_name, current_streak, completed_goals, updated_at')
      .order('current_streak', { ascending: false })
      .order('completed_goals', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(Math.max(1, Math.floor(limit)));

    if (error || !data) {
      return [];
    }

    return data.map((row: SupabaseProfileRow) => ({
      userId: row.user_id,
      displayName: row.display_name?.trim() ?? '',
      currentStreak: normalizeCount(row.current_streak ?? 0),
      completedGoals: normalizeCount(row.completed_goals ?? 0),
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

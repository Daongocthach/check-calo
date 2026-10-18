-- Phase 2: apply only after the app release that reads its own profile through
-- public.get_my_profile() is installed by most users. Older versions then fail to
-- restore the cloud profile after login (the user re-enters it on the welcome screen).
-- To apply: move this file into supabase/migrations with a new timestamp.

-- Leaderboard keeps reading these columns for every row; health fields become
-- readable only through get_my_profile().
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (user_id, display_name, current_streak, completed_goals, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

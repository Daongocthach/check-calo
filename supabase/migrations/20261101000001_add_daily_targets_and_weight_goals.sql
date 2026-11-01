-- Expand-only: two new per-user tables, nothing existing changes. Installed app versions keep
-- working because they never read or write them.
-- daily_targets: the plan each day is judged by (calorie and macro targets, goal mode), so a
-- reinstall or a new device judges past days by their own plan instead of today's.
-- weight_goals: the goal history, mirrored from the device's SQLite table of the same name.
-- Apply before shipping the app version that syncs them.

CREATE TABLE IF NOT EXISTS public.daily_targets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date text NOT NULL,
  calorie_target integer NOT NULL CHECK (calorie_target >= 0),
  -- NULL: the day was planned before macro targets were saved per day.
  protein_target_grams numeric,
  carbs_target_grams numeric,
  fat_target_grams numeric,
  -- NULL: a manual target saved without a goal.
  goal_mode text CHECK (goal_mode IN ('lose', 'gain', 'maintain')),
  source text NOT NULL CHECK (source IN ('profile', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_date)
);

CREATE TABLE IF NOT EXISTS public.weight_goals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('lose', 'gain', 'maintain')),
  target_kg numeric,
  target_kcal_delta integer NOT NULL DEFAULT 0,
  target_days integer NOT NULL DEFAULT 0,
  start_weight_kg numeric,
  target_weight_kg numeric,
  monthly_rate_kg numeric,
  status text NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_targets_select_own" ON public.daily_targets;
DROP POLICY IF EXISTS "daily_targets_insert_own" ON public.daily_targets;
DROP POLICY IF EXISTS "daily_targets_update_own" ON public.daily_targets;
DROP POLICY IF EXISTS "daily_targets_delete_own" ON public.daily_targets;

CREATE POLICY "daily_targets_select_own"
  ON public.daily_targets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "daily_targets_insert_own"
  ON public.daily_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_targets_update_own"
  ON public.daily_targets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_targets_delete_own"
  ON public.daily_targets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weight_goals_select_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_insert_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_update_own" ON public.weight_goals;
DROP POLICY IF EXISTS "weight_goals_delete_own" ON public.weight_goals;

CREATE POLICY "weight_goals_select_own"
  ON public.weight_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "weight_goals_insert_own"
  ON public.weight_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_goals_update_own"
  ON public.weight_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_goals_delete_own"
  ON public.weight_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

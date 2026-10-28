-- Expand-only: weight goal fields on profiles plus a daily weigh-in log. Installed app
-- versions keep working: they never send or select the new columns, keep writing
-- desired_weight_kg, and get_my_profile() only gains trailing output columns.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_weight_goal_kg numeric,
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric;

-- One weigh-in per user per day; the latest write for a day wins.
CREATE TABLE IF NOT EXISTS public.weight_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date text NOT NULL,
  weight_kg numeric NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_logs_select_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_insert_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_update_own" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_delete_own" ON public.weight_logs;

CREATE POLICY "weight_logs_select_own"
  ON public.weight_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "weight_logs_insert_own"
  ON public.weight_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_update_own"
  ON public.weight_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_delete_own"
  ON public.weight_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- The return type changes, so the function has to be dropped first. Runs in the
-- migration transaction, so callers never see it missing.
DROP FUNCTION IF EXISTS public.get_my_profile();

CREATE FUNCTION public.get_my_profile()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  gender text,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  desired_weight_kg numeric,
  activity_level text,
  monthly_weight_goal_kg numeric,
  target_weight_kg numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.gender,
    p.age,
    p.height_cm,
    p.weight_kg,
    p.desired_weight_kg,
    p.activity_level,
    p.monthly_weight_goal_kg,
    p.target_weight_kg
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

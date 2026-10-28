-- Rollback for 20261028000001_add_weight_logs_and_goal_fields.sql
-- Only roll this back after the app no longer reads or writes weight_logs or the new
-- profile columns. Dropping weight_logs deletes every synced weigh-in.

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
  activity_level text
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
    p.activity_level
  FROM public.profiles AS p
  WHERE p.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

DROP TABLE IF EXISTS public.weight_logs;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS monthly_weight_goal_kg,
  DROP COLUMN IF EXISTS target_weight_kg;

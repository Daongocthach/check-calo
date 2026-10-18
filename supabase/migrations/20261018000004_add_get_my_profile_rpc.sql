-- Phase 1 of hiding health fields in profiles: give the app a way to read its own
-- health fields that does not depend on table-wide SELECT. Phase 2
-- (supabase/deferred/hide_profile_health_columns.sql) revokes those columns once
-- the app version that uses this function is widely installed.

CREATE OR REPLACE FUNCTION public.get_my_profile()
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

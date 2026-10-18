-- Rollback for deferred/hide_profile_health_columns.sql

GRANT SELECT ON public.profiles TO anon, authenticated;

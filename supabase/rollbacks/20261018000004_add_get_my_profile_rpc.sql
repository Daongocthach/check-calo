-- Rollback for 20261018000004_add_get_my_profile_rpc.sql
-- Only roll this back after the app no longer calls get_my_profile().

DROP FUNCTION IF EXISTS public.get_my_profile();

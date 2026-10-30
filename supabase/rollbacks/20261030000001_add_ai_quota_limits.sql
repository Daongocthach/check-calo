-- Rollback for 20261030000001_add_ai_quota_limits.sql
-- Redeploy a gemini-food-parser version that calls consume_daily_ai_usage() first;
-- the current one fails every request once consume_ai_quota() is gone.

DROP FUNCTION IF EXISTS public.consume_ai_quota(uuid, text, boolean, integer, text, integer, integer, integer);

DROP TABLE IF EXISTS public.ai_usage_ip_daily;
DROP TABLE IF EXISTS public.ai_usage_global_daily;

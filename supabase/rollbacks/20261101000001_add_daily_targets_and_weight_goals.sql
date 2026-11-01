-- Rollback for 20261101000001_add_daily_targets_and_weight_goals.sql
-- Only roll this back after the app no longer syncs daily targets or weight goals. Dropping
-- the tables deletes every synced day plan and goal; devices keep their local copies.

DROP TABLE IF EXISTS public.daily_targets;
DROP TABLE IF EXISTS public.weight_goals;

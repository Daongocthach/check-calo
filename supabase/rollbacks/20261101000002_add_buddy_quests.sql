-- Rollback for 20261101000002_add_buddy_quests.sql
-- Only roll this back after the app no longer shows quests. Dropping the completions deletes
-- every point earned through quests; devices keep their local copies.

DROP FUNCTION IF EXISTS public.complete_buddy_quest(text, text);
DROP FUNCTION IF EXISTS public.claim_buddy_legacy_points(integer);
DROP TABLE IF EXISTS public.buddy_quest_completions;
DROP TABLE IF EXISTS public.buddy_quests;

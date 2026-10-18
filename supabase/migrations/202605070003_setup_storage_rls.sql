-- Migration: Setup storage bucket for food-entry-images
-- Created at: 2026-05-07
--
-- Production never applied the policies this file originally created (including a
-- public SELECT policy that let anyone list every user's images). Owner-only
-- policies come from 20260508161313_update_storage_policies_for_users_folder.sql,
-- which is what production runs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('food-entry-images', 'food-entry-images', true)
ON CONFLICT (id) DO NOTHING;

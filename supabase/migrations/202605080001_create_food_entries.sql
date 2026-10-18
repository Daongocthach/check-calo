-- Baseline for food_entries. Production created this table outside of migrations;
-- this file reproduces its schema and RLS so local databases match production.

CREATE TABLE IF NOT EXISTS public.food_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_local_id text,
  entry_date text NOT NULL,
  consumed_at timestamptz NOT NULL,
  meal_name text NOT NULL,
  quantity_label text NOT NULL,
  quantity_grams numeric,
  total_calories numeric NOT NULL DEFAULT 0,
  protein_grams numeric NOT NULL DEFAULT 0,
  carbs_grams numeric NOT NULL DEFAULT 0,
  fat_grams numeric NOT NULL DEFAULT 0,
  notes text,
  image_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_entries_select_own" ON public.food_entries;
DROP POLICY IF EXISTS "food_entries_insert_own" ON public.food_entries;
DROP POLICY IF EXISTS "food_entries_update_own" ON public.food_entries;
DROP POLICY IF EXISTS "food_entries_delete_own" ON public.food_entries;

CREATE POLICY "food_entries_select_own"
  ON public.food_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "food_entries_insert_own"
  ON public.food_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_entries_update_own"
  ON public.food_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_entries_delete_own"
  ON public.food_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

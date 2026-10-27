-- Expand-only: adds nullable nutrient columns. NULL means unknown (older entries, products
-- without the value on the label), so nothing is backfilled. Installed app versions keep
-- working because they never send or select these columns.
-- Apply before shipping the app version that writes them: PostgREST rejects unknown columns.

ALTER TABLE public.food_entries
  ADD COLUMN IF NOT EXISTS fiber_grams numeric,
  ADD COLUMN IF NOT EXISTS sugar_grams numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS trans_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric;

ALTER TABLE public.recent_foods
  ADD COLUMN IF NOT EXISTS fiber_grams numeric,
  ADD COLUMN IF NOT EXISTS sugar_grams numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS trans_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric;

ALTER TABLE public.food_products
  ADD COLUMN IF NOT EXISTS fiber_grams numeric,
  ADD COLUMN IF NOT EXISTS sugar_grams numeric,
  ADD COLUMN IF NOT EXISTS saturated_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS trans_fat_grams numeric,
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric,
  ADD COLUMN IF NOT EXISTS potassium_mg numeric;

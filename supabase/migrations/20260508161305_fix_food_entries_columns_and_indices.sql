-- Add missing columns to food_entries
ALTER TABLE public.food_entries ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.food_entries ADD COLUMN IF NOT EXISTS thumbnail_uri text;

-- Add missing indices to food_entries
CREATE INDEX IF NOT EXISTS idx_food_entries_entry_date ON public.food_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON public.food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at ON public.food_entries(consumed_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_barcode ON public.food_entries(barcode);

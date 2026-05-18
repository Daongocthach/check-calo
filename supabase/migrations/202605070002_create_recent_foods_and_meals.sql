CREATE TABLE IF NOT EXISTS public.recent_foods (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_entry_id text,
  name text NOT NULL,
  quantity_label text NOT NULL,
  quantity_grams numeric,
  total_calories numeric NOT NULL,
  protein_grams numeric NOT NULL,
  carbs_grams numeric NOT NULL,
  fat_grams numeric NOT NULL,
  notes text,
  image_uri text,
  thumbnail_uri text,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recent_foods_user_id ON public.recent_foods(user_id);

CREATE TABLE IF NOT EXISTS public.meals (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_local_id text NOT NULL,
  meal_type text NOT NULL,
  note text,
  eaten_at timestamptz NOT NULL,
  total_calories numeric NOT NULL DEFAULT 0,
  total_protein_grams numeric NOT NULL DEFAULT 0,
  total_carbs_grams numeric NOT NULL DEFAULT 0,
  total_fat_grams numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);

CREATE TABLE IF NOT EXISTS public.meal_items (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id text NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  device_local_id text NOT NULL,
  source_key text,
  title text NOT NULL,
  quantity_label text NOT NULL,
  quantity_grams numeric,
  servings numeric NOT NULL DEFAULT 1,
  total_calories numeric NOT NULL DEFAULT 0,
  protein_grams numeric NOT NULL DEFAULT 0,
  carbs_grams numeric NOT NULL DEFAULT 0,
  fat_grams numeric NOT NULL DEFAULT 0,
  notes text,
  image_uri text,
  thumbnail_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_meal_items_user_id ON public.meal_items(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON public.meal_items(meal_id);

CREATE TABLE IF NOT EXISTS public.meal_images (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id text NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  device_local_id text NOT NULL,
  remote_path text NOT NULL,
  mime_type text,
  file_name text,
  file_size integer,
  width integer,
  height integer,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_meal_images_user_id ON public.meal_images(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_images_meal_id ON public.meal_images(meal_id);

-- Enable RLS for all tables
ALTER TABLE public.recent_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_images ENABLE ROW LEVEL SECURITY;

-- Policies for recent_foods
CREATE POLICY "Users can view their own recent foods" ON public.recent_foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recent foods" ON public.recent_foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recent foods" ON public.recent_foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recent foods" ON public.recent_foods FOR DELETE USING (auth.uid() = user_id);

-- Policies for meals
CREATE POLICY "Users can view their own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Policies for meal_items
CREATE POLICY "Users can view their own meal items" ON public.meal_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal items" ON public.meal_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal items" ON public.meal_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal items" ON public.meal_items FOR DELETE USING (auth.uid() = user_id);

-- Policies for meal_images
CREATE POLICY "Users can view their own meal images" ON public.meal_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal images" ON public.meal_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal images" ON public.meal_images FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal images" ON public.meal_images FOR DELETE USING (auth.uid() = user_id);

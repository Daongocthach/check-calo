CREATE TABLE IF NOT EXISTS public.food_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  quantity_label text NOT NULL,
  quantity_grams numeric,
  calories numeric NOT NULL DEFAULT 0,
  protein_grams numeric NOT NULL DEFAULT 0,
  carbs_grams numeric NOT NULL DEFAULT 0,
  fat_grams numeric NOT NULL DEFAULT 0,
  image_url text,
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'openfoodfacts', 'admin')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_products_barcode_idx
  ON public.food_products (barcode);

CREATE OR REPLACE FUNCTION public.set_food_products_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_food_products_updated_at ON public.food_products;

CREATE TRIGGER set_food_products_updated_at
  BEFORE UPDATE ON public.food_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_food_products_updated_at();

ALTER TABLE public.food_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Food products are readable by everyone" ON public.food_products;
DROP POLICY IF EXISTS "Authenticated users can insert food products" ON public.food_products;
DROP POLICY IF EXISTS "Authenticated users can update food products" ON public.food_products;

CREATE POLICY "Food products are readable by everyone"
  ON public.food_products
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert food products"
  ON public.food_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update food products"
  ON public.food_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

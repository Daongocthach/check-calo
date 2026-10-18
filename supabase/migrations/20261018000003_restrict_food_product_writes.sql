-- Any signed-in user (anonymous sign-in included) could overwrite shared barcode
-- products. Users may now only add products for barcodes that do not exist yet,
-- and cannot mark them as admin-sourced. Existing rows are no longer updatable
-- from the client; installed app versions only log a warning when the upsert fails.

DROP POLICY IF EXISTS "Authenticated users can update food products" ON public.food_products;
DROP POLICY IF EXISTS "Authenticated users can insert food products" ON public.food_products;

CREATE POLICY "Authenticated users can insert food products"
  ON public.food_products
  FOR INSERT
  TO authenticated
  WITH CHECK (source IN ('user', 'openfoodfacts'));

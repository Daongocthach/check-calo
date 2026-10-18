-- Rollback for 20261018000003_restrict_food_product_writes.sql

DROP POLICY IF EXISTS "Authenticated users can insert food products" ON public.food_products;
DROP POLICY IF EXISTS "Authenticated users can update food products" ON public.food_products;

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

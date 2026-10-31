import type {
  BarcodeFoodLookupResult,
  FoodProductCatalogInput,
  FoodProductSource,
} from './barcodeFoodLookup.types';
import { getLocalFoodProductByBarcode, upsertLocalFoodProduct } from './foodProductRepository';
import { fetchOpenFoodFactsProduct } from './openFoodFacts';
import { fetchSupabaseFoodProduct, upsertSupabaseFoodProduct } from './supabaseFoodProducts';

export type { BarcodeFoodLookupResult, FoodProductCatalogInput } from './barcodeFoodLookup.types';

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toCatalogInput(
  lookup: BarcodeFoodLookupResult,
  source: FoodProductSource
): FoodProductCatalogInput | null {
  if (!lookup.foodName.trim()) {
    return null;
  }

  return {
    barcode: lookup.barcode,
    name: lookup.foodName,
    brand: lookup.brand || null,
    quantityLabel: lookup.quantityLabel || '1 serving',
    quantityGrams: toOptionalNumber(lookup.quantityGrams),
    totalCalories: toOptionalNumber(lookup.calories) ?? 0,
    proteinGrams: toOptionalNumber(lookup.protein) ?? 0,
    carbsGrams: toOptionalNumber(lookup.carbs) ?? 0,
    fatGrams: toOptionalNumber(lookup.fat) ?? 0,
    ...lookup.nutrients,
    notes: lookup.notes || null,
    imageUri: lookup.imageUri ?? null,
    source,
    verifiedAt: source === 'openfoodfacts' ? new Date().toISOString() : null,
  };
}

/** Saves a product to the local catalog and, when configured, the shared Supabase catalog. */
export async function upsertFoodProductCatalog(input: FoodProductCatalogInput) {
  const barcode = input.barcode.trim();
  const name = input.name.trim();

  if (!barcode || !name) {
    return;
  }

  const normalizedInput = { ...input, barcode, name };
  await upsertLocalFoodProduct(normalizedInput);
  await upsertSupabaseFoodProduct(normalizedInput);
}

/**
 * Finds a product by barcode: the device first, then the shared catalog, then Open Food Facts.
 * Remote finds are kept locally so the next scan works offline.
 */
export async function lookupFoodByBarcode(
  barcode: string
): Promise<BarcodeFoodLookupResult | null> {
  const trimmedBarcode = barcode.trim();

  if (!trimmedBarcode) {
    return null;
  }

  const localProduct = await getLocalFoodProductByBarcode(trimmedBarcode);

  if (localProduct) {
    return localProduct;
  }

  const shared = await fetchSupabaseFoodProduct(trimmedBarcode);

  if (shared) {
    const localInput = toCatalogInput(shared.product, shared.source);

    if (localInput) {
      await upsertLocalFoodProduct(localInput);
    }

    return shared.product;
  }

  const product = await fetchOpenFoodFactsProduct(trimmedBarcode);
  const catalogInput = product ? toCatalogInput(product, 'openfoodfacts') : null;

  if (catalogInput) {
    await upsertFoodProductCatalog(catalogInput);
  }

  return product;
}

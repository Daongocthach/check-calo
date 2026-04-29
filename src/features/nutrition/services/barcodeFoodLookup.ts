import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { createEntityId, nowIsoString } from '../utils/calorie';

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  serving_size?: string;
  quantity?: string;
  nutriments?: Record<string, number | string | undefined>;
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: OpenFoodFactsProduct;
}

export interface BarcodeFoodLookupResult {
  barcode: string;
  foodName: string;
  brand: string;
  quantityLabel: string;
  quantityGrams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  imageUri?: string;
  source: 'local' | 'supabase' | 'openfoodfacts';
}

interface FoodProductRow {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  quantity_label: string;
  quantity_grams: number | null;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  source: 'user' | 'openfoodfacts' | 'admin';
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseFoodProductRow {
  id?: string;
  barcode: string;
  name: string;
  brand: string | null;
  quantity_label: string;
  quantity_grams: number | null;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  image_url: string | null;
  source: 'user' | 'openfoodfacts' | 'admin';
  verified_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FoodProductCatalogInput {
  barcode: string;
  name: string;
  brand?: string | null;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
  source: 'user' | 'openfoodfacts' | 'admin';
  verifiedAt?: string | null;
}

const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_url',
  'serving_size',
  'quantity',
  'nutriments',
] as const;

function toCleanString(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function toRoundedString(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseGrams(value: string) {
  const normalizedValue = value.replace(',', '.');
  const match = normalizedValue.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml)\b/i);

  if (!match) {
    return '';
  }

  const parsedValue = Number(match[1]);
  return Number.isFinite(parsedValue) ? toRoundedString(parsedValue) : '';
}

function toNumber(value: number | string | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function getNutrimentValue(
  nutriments: Record<string, number | string | undefined> | undefined,
  servingKey: string,
  per100gKey: string
) {
  if (!nutriments) {
    return '';
  }

  const value = toNumber(nutriments[servingKey]) ?? toNumber(nutriments[per100gKey]);
  return toRoundedString(value);
}

function buildNotes(barcode: string, brands: string) {
  const noteParts = [brands, barcode].filter(Boolean);
  return noteParts.join(' • ');
}

function mapFoodProductRow(
  row: FoodProductRow,
  source: BarcodeFoodLookupResult['source']
): BarcodeFoodLookupResult {
  return {
    barcode: row.barcode,
    foodName: row.name,
    brand: row.brand ?? '',
    quantityLabel: row.quantity_label,
    quantityGrams: toRoundedString(row.quantity_grams),
    calories: toRoundedString(row.total_calories),
    protein: toRoundedString(row.protein_grams),
    carbs: toRoundedString(row.carbs_grams),
    fat: toRoundedString(row.fat_grams),
    notes: row.notes ?? buildNotes(row.barcode, row.brand ?? ''),
    imageUri: row.image_uri ?? undefined,
    source,
  };
}

function mapSupabaseFoodProductRow(row: SupabaseFoodProductRow): BarcodeFoodLookupResult {
  return {
    barcode: row.barcode,
    foodName: row.name,
    brand: row.brand ?? '',
    quantityLabel: row.quantity_label,
    quantityGrams: toRoundedString(row.quantity_grams),
    calories: toRoundedString(row.calories),
    protein: toRoundedString(row.protein_grams),
    carbs: toRoundedString(row.carbs_grams),
    fat: toRoundedString(row.fat_grams),
    notes: buildNotes(row.barcode, row.brand ?? ''),
    imageUri: row.image_url ?? undefined,
    source: 'supabase',
  };
}

function toCatalogInputFromLookup(
  lookup: BarcodeFoodLookupResult,
  source: FoodProductCatalogInput['source']
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
    notes: lookup.notes || null,
    imageUri: lookup.imageUri ?? null,
    source,
    verifiedAt: source === 'openfoodfacts' ? new Date().toISOString() : null,
  };
}

async function getLocalFoodProductByBarcode(barcode: string) {
  const database = await getDatabase();
  const favoriteRow = await database.getFirstAsync<FoodProductRow>(
    `
      SELECT
        id,
        barcode,
        name,
        NULL AS brand,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        'user' AS source,
        NULL AS verified_at,
        created_at,
        updated_at
      FROM favorite_foods
      WHERE barcode = ?
      LIMIT 1;
    `,
    [barcode]
  );

  if (favoriteRow) {
    return mapFoodProductRow(favoriteRow, 'local');
  }

  const productRow = await database.getFirstAsync<FoodProductRow>(
    'SELECT * FROM food_products WHERE barcode = ? LIMIT 1;',
    [barcode]
  );

  return productRow ? mapFoodProductRow(productRow, 'local') : null;
}

async function upsertLocalFoodProduct(input: FoodProductCatalogInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existing = await database.getFirstAsync<{ id: string; created_at: string }>(
    'SELECT id, created_at FROM food_products WHERE barcode = ? LIMIT 1;',
    [input.barcode]
  );

  await database.runAsync(
    `
      INSERT INTO food_products (
        id,
        barcode,
        name,
        brand,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        source,
        verified_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(barcode) DO UPDATE SET
        name = excluded.name,
        brand = excluded.brand,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        notes = excluded.notes,
        image_uri = excluded.image_uri,
        source = excluded.source,
        verified_at = excluded.verified_at,
        updated_at = excluded.updated_at;
    `,
    [
      existing?.id ?? createEntityId('product'),
      input.barcode,
      input.name,
      input.brand ?? null,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? null,
      input.source,
      input.verifiedAt ?? null,
      existing?.created_at ?? now,
      now,
    ]
  );
}

async function lookupSupabaseFoodProduct(barcode: string) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  const { data, error } = await supabase
    .from('food_products')
    .select(
      'id, barcode, name, brand, quantity_label, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, image_url, source, verified_at, created_at, updated_at'
    )
    .eq('barcode', barcode)
    .maybeSingle<SupabaseFoodProductRow>();

  if (error) {
    if (__DEV__) {
      console.warn('[Barcode] Supabase food_products lookup failed', error.message);
    }
    return null;
  }

  if (!data) {
    return null;
  }

  const lookup = mapSupabaseFoodProductRow(data);
  const localInput = toCatalogInputFromLookup(lookup, data.source ?? 'admin');

  if (localInput) {
    await upsertLocalFoodProduct(localInput);
  }

  return lookup;
}

export async function upsertFoodProductCatalog(input: FoodProductCatalogInput) {
  const trimmedBarcode = input.barcode.trim();

  if (!trimmedBarcode || !input.name.trim()) {
    return;
  }

  const normalizedInput = {
    ...input,
    barcode: trimmedBarcode,
    name: input.name.trim(),
  };

  await upsertLocalFoodProduct(normalizedInput);

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('food_products').upsert(
    {
      barcode: normalizedInput.barcode,
      name: normalizedInput.name,
      brand: normalizedInput.brand ?? null,
      quantity_label: normalizedInput.quantityLabel,
      quantity_grams: normalizedInput.quantityGrams ?? null,
      calories: normalizedInput.totalCalories,
      protein_grams: normalizedInput.proteinGrams,
      carbs_grams: normalizedInput.carbsGrams,
      fat_grams: normalizedInput.fatGrams,
      image_url: normalizedInput.imageUri ?? null,
      source: normalizedInput.source,
      verified_at: normalizedInput.verifiedAt ?? null,
      updated_at: now,
    },
    { onConflict: 'barcode' }
  );

  if (error && __DEV__) {
    console.warn('[Barcode] Supabase food_products upsert failed', error.message);
  }
}

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

  const supabaseProduct = await lookupSupabaseFoodProduct(trimmedBarcode);

  if (supabaseProduct) {
    return supabaseProduct;
  }

  const query = new URLSearchParams({
    fields: OPEN_FOOD_FACTS_FIELDS.join(','),
  });

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmedBarcode)}?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Barcode lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (payload.status !== 1 || !payload.product) {
    return null;
  }

  const { product } = payload;
  const brands = toCleanString(product.brands);

  const lookup = {
    barcode: trimmedBarcode,
    foodName: toCleanString(product.product_name),
    brand: brands,
    quantityLabel: parseGrams(
      toCleanString(product.serving_size) || toCleanString(product.quantity)
    ),
    quantityGrams: parseGrams(
      toCleanString(product.serving_size) || toCleanString(product.quantity)
    ),
    calories: getNutrimentValue(product.nutriments, 'energy-kcal_serving', 'energy-kcal_100g'),
    protein: getNutrimentValue(product.nutriments, 'proteins_serving', 'proteins_100g'),
    carbs: getNutrimentValue(product.nutriments, 'carbohydrates_serving', 'carbohydrates_100g'),
    fat: getNutrimentValue(product.nutriments, 'fat_serving', 'fat_100g'),
    notes: buildNotes(trimmedBarcode, brands),
    imageUri: toCleanString(product.image_front_url) || undefined,
    source: 'openfoodfacts',
  } satisfies BarcodeFoodLookupResult;

  const catalogInput = toCatalogInputFromLookup(lookup, 'openfoodfacts');

  if (catalogInput) {
    await upsertFoodProductCatalog(catalogInput);
  }

  return lookup;
}

import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { NUTRIENT_SQL, nutrientsFromColumns, toNutrientColumns } from '../utils/nutrients';
import type { NutrientColumnValues } from '../utils/nutrients';
import { buildProductNotes, toRoundedString } from '../utils/productFormat';
import type {
  BarcodeFoodLookupResult,
  FoodProductCatalogInput,
  FoodProductSource,
} from './barcodeFoodLookup.types';

/** Nutrient columns are absent until the cloud migration that adds them has run. */
interface SupabaseFoodProductRow extends Partial<NutrientColumnValues> {
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
  source: FoodProductSource | null;
}

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
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
    notes: buildProductNotes(row.barcode, row.brand ?? ''),
    imageUri: row.image_url ?? undefined,
    nutrients: nutrientsFromColumns(row),
    source: 'supabase',
  };
}

/** The shared catalog's product for a barcode, with who added it; null when missing or offline. */
export async function fetchSupabaseFoodProduct(barcode: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('food_products')
    .select(
      `barcode, name, brand, quantity_label, quantity_grams, calories, protein_grams, carbs_grams, fat_grams, ${NUTRIENT_SQL.columns}, image_url, source`
    )
    .eq('barcode', barcode)
    .maybeSingle<SupabaseFoodProductRow>();

  if (error) {
    if (__DEV__) {
      console.warn('[Barcode] Supabase food_products lookup failed', error.message);
    }
    return null;
  }

  return data ? { product: mapSupabaseFoodProductRow(data), source: data.source ?? 'admin' } : null;
}

export async function upsertSupabaseFoodProduct(input: FoodProductCatalogInput) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await supabase.from('food_products').upsert(
    {
      barcode: input.barcode,
      name: input.name,
      brand: input.brand ?? null,
      quantity_label: input.quantityLabel,
      quantity_grams: input.quantityGrams ?? null,
      calories: input.totalCalories,
      protein_grams: input.proteinGrams,
      carbs_grams: input.carbsGrams,
      fat_grams: input.fatGrams,
      ...toNutrientColumns(input),
      image_url: input.imageUri ?? null,
      source: input.source,
      verified_at: input.verifiedAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'barcode' }
  );

  if (error && __DEV__) {
    console.warn('[Barcode] Supabase food_products upsert failed', error.message);
  }
}

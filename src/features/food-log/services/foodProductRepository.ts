import { getDatabase } from '@/services/database/sqlite';
import { nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import {
  NUTRIENT_SQL,
  nutrientsFromColumns,
  toNutrientParams,
  type NutrientColumnValues,
} from '../utils/nutrients';
import { buildProductNotes, toRoundedString } from '../utils/productFormat';
import type {
  BarcodeFoodLookupResult,
  FoodProductCatalogInput,
  FoodProductSource,
} from './barcodeFoodLookup.types';

interface FoodProductRow extends NutrientColumnValues {
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
  source: FoodProductSource;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapFoodProductRow(row: FoodProductRow): BarcodeFoodLookupResult {
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
    notes: row.notes ?? buildProductNotes(row.barcode, row.brand ?? ''),
    imageUri: row.image_uri ?? undefined,
    nutrients: nutrientsFromColumns(row),
    source: 'local',
  };
}

/** A food the user logged with this barcode, else the saved catalog product. */
export async function getLocalFoodProductByBarcode(barcode: string) {
  const database = await getDatabase();
  const recentRow = await database.getFirstAsync<FoodProductRow>(
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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        'user' AS source,
        NULL AS verified_at,
        created_at,
        updated_at
      FROM recent_foods
      WHERE barcode = ?
      LIMIT 1;
    `,
    [barcode]
  );

  if (recentRow) {
    return mapFoodProductRow(recentRow);
  }

  const productRow = await database.getFirstAsync<FoodProductRow>(
    'SELECT * FROM food_products WHERE barcode = ? LIMIT 1;',
    [barcode]
  );

  return productRow ? mapFoodProductRow(productRow) : null;
}

export async function upsertLocalFoodProduct(input: FoodProductCatalogInput) {
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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        source,
        verified_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(barcode) DO UPDATE SET
        name = excluded.name,
        brand = excluded.brand,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        ${NUTRIENT_SQL.excluded},
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
      ...toNutrientParams(input),
      input.notes ?? null,
      input.imageUri ?? null,
      input.source,
      input.verifiedAt ?? null,
      existing?.created_at ?? now,
      now,
    ]
  );
}

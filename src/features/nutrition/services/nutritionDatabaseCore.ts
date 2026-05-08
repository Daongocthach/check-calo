import { getDatabase } from '@/services/database/sqlite';
import type { FoodEntry, RecentFood } from '../types';
import { nowIsoString } from '../utils/calorie';

export interface FoodEntryRow {
  id: string;
  barcode: string | null;
  entry_date: string;
  consumed_at: string;
  meal_name: string;
  quantity_label: string;
  quantity_grams: number | null;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
  created_at: string;
  updated_at: string;
  is_recent: number;
}

export interface RecentFoodRow {
  id: string;
  source_entry_id: string | null;
  barcode: string | null;
  name: string;
  quantity_label: string;
  quantity_grams: number | null;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
  created_at: string;
  updated_at: string;
}

export function mapFoodEntry(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    barcode: row.barcode,
    entryDate: row.entry_date,
    consumedAt: row.consumed_at,
    mealName: row.meal_name,
    quantityLabel: row.quantity_label,
    quantityGrams: row.quantity_grams,
    totalCalories: row.total_calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
    notes: row.notes,
    imageUri: row.image_uri,
    thumbnailUri: row.thumbnail_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isRecent: row.is_recent === 1,
  };
}

export function mapRecentFood(row: RecentFoodRow): RecentFood {
  return {
    id: row.id,
    sourceEntryId: row.source_entry_id,
    barcode: row.barcode,
    name: row.name,
    quantityLabel: row.quantity_label,
    quantityGrams: row.quantity_grams,
    totalCalories: row.total_calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
    notes: row.notes,
    imageUri: row.image_uri,
    thumbnailUri: row.thumbnail_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFoodEntryById(entryId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<FoodEntryRow>(
    `
      SELECT
        food_entries.*,
        CASE WHEN recent_foods.id IS NOT NULL THEN 1 ELSE 0 END AS is_recent
      FROM food_entries
      LEFT JOIN recent_foods ON recent_foods.source_entry_id = food_entries.id
      WHERE food_entries.id = ?
      LIMIT 1;
    `,
    [entryId]
  );

  return row ? mapFoodEntry(row) : null;
}

export async function replaceImageUriReferences(previousUri: string, nextUri: string | null) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE food_entries
        SET image_uri = ?, updated_at = ?
        WHERE image_uri = ?;
      `,
      [nextUri, now, previousUri]
    );

    await database.runAsync(
      `
        UPDATE recent_foods
        SET image_uri = ?, updated_at = ?
        WHERE image_uri = ?;
      `,
      [nextUri, now, previousUri]
    );
  });
}

export async function replaceThumbnailUriReferences(previousUri: string, nextUri: string | null) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE food_entries
        SET thumbnail_uri = ?, updated_at = ?
        WHERE thumbnail_uri = ?;
      `,
      [nextUri, now, previousUri]
    );

    await database.runAsync(
      `
        UPDATE recent_foods
        SET thumbnail_uri = ?, updated_at = ?
        WHERE thumbnail_uri = ?;
      `,
      [nextUri, now, previousUri]
    );
  });
}

export async function countImageAssetReferences(uri: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ reference_count: number | null }>(
    `
      SELECT (
        SELECT COUNT(*) FROM food_entries WHERE image_uri = ? OR thumbnail_uri = ?
      ) + (
        SELECT COUNT(*) FROM recent_foods WHERE image_uri = ? OR thumbnail_uri = ?
      ) AS reference_count;
    `,
    [uri, uri, uri, uri]
  );

  return row?.reference_count ?? 0;
}

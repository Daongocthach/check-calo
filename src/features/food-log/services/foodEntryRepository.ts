import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import type { FoodEntryInput } from '../types';
import { NUTRIENT_SQL, toNutrientParams } from '../utils/nutrients';
import { getFoodEntryById, mapFoodEntry } from './foodEntryRepositoryCore';
import type { FoodEntryRow } from './foodEntryRepositoryCore';
import { deleteFoodEntryFromCloud, syncFoodEntryToCloud } from './foodEntrySync';

export async function listFoodEntriesByDate(date: string | Date) {
  const database = await getDatabase();
  const normalizedDate = formatDateKey(date);
  const rows = await database.getAllAsync<FoodEntryRow>(
    `
      SELECT
        food_entries.*,
        CASE WHEN recent_foods.id IS NOT NULL THEN 1 ELSE 0 END AS is_recent
      FROM food_entries
      LEFT JOIN recent_foods ON recent_foods.source_entry_id = food_entries.id
      WHERE food_entries.entry_date = ?
      ORDER BY food_entries.consumed_at DESC;
    `,
    [normalizedDate]
  );

  return rows.map(mapFoodEntry);
}

export async function createFoodEntry(input: FoodEntryInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const consumedAt = input.consumedAt ?? now;
  const entryDate = formatDateKey(input.entryDate ?? consumedAt);
  const id = createEntityId('entry');

  await database.runAsync(
    `
      INSERT INTO food_entries (
        id,
        entry_date,
        consumed_at,
        barcode,
        meal_name,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?);
    `,
    [
      id,
      entryDate,
      consumedAt,
      input.barcode ?? null,
      input.mealName,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      ...toNutrientParams(input),
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? null,
      now,
      now,
    ]
  );

  const createdEntry = await getFoodEntryById(id);

  if (createdEntry) {
    void syncFoodEntryToCloud(createdEntry.id);
  }

  if (!createdEntry) {
    throw new Error('Failed to create food entry');
  }

  return createdEntry;
}

export async function updateFoodEntry(entryId: string, input: FoodEntryInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existingEntry = await getFoodEntryById(entryId);

  if (!existingEntry) {
    throw new Error('Food entry not found');
  }

  const consumedAt = input.consumedAt ?? existingEntry.consumedAt;
  const entryDate = formatDateKey(input.entryDate ?? existingEntry.entryDate);

  await database.runAsync(
    `
      UPDATE food_entries
      SET
        entry_date = ?,
        consumed_at = ?,
        barcode = ?,
        meal_name = ?,
        quantity_label = ?,
        quantity_grams = ?,
        total_calories = ?,
        protein_grams = ?,
        carbs_grams = ?,
        fat_grams = ?,
        ${NUTRIENT_SQL.assignments},
        notes = ?,
        image_uri = ?,
        thumbnail_uri = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    [
      entryDate,
      consumedAt,
      input.barcode ?? existingEntry.barcode ?? null,
      input.mealName,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      ...toNutrientParams(input),
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? null,
      now,
      entryId,
    ]
  );

  void syncFoodEntryToCloud(entryId);

  return getFoodEntryById(entryId);
}

export async function deleteFoodEntries(entryIds: string[]) {
  if (entryIds.length === 0) {
    return;
  }

  const database = await getDatabase();
  await database.runAsync(
    `DELETE FROM food_entries WHERE id IN (${entryIds.map(() => '?').join(', ')});`,
    entryIds
  );
  entryIds.forEach((entryId) => void deleteFoodEntryFromCloud(entryId));
}

export async function resetNutritionData() {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM recent_foods;');
    await database.runAsync('DELETE FROM food_entries;');
    await database.runAsync('DELETE FROM daily_calorie_targets;');
    await database.runAsync('DELETE FROM user_profile;');
  });
}

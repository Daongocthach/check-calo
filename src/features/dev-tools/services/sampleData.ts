import type { NutrientValues } from '@/features/food-log/types';
import { NUTRIENT_SQL, toNutrientParams } from '@/features/food-log/utils/nutrients';
import { getDatabase, withWriteTransaction } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import { SAMPLE_DAY, SAMPLE_ENTRY_ID_PREFIX } from '../constants/sampleFoods';

function scaleNutrients(nutrients: Partial<NutrientValues>, scale: number) {
  return Object.fromEntries(
    Object.entries(nutrients).map(([key, value]) => [
      key,
      typeof value === 'number' ? Math.round(value * scale * 10) / 10 : value,
    ])
  ) as Partial<NutrientValues>;
}

/**
 * Inserts sample meals for today and the previous days straight into SQLite. Rows bypass the
 * repository on purpose so they are never pushed to the cloud.
 */
export async function seedSampleFoodEntries(days = 7) {
  const database = await getDatabase();
  const now = new Date();
  const createdAt = nowIsoString();
  let inserted = 0;

  await withWriteTransaction(database, async () => {
    for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
      // Vary portions a little so the progress charts are not flat.
      const scale = 0.8 + ((dayOffset * 7) % 5) / 10;

      for (const food of SAMPLE_DAY) {
        const consumed = new Date(now);
        consumed.setDate(now.getDate() - dayOffset);
        consumed.setHours(food.hour, food.minute, 0, 0);

        // Today only gets the meals that already happened.
        if (consumed > now) {
          continue;
        }

        await database.runAsync(
          `
            INSERT INTO food_entries (
              id, entry_date, consumed_at, barcode, meal_name, quantity_label, quantity_grams,
              total_calories, protein_grams, carbs_grams, fat_grams, ${NUTRIENT_SQL.columns},
              notes, image_uri, thumbnail_uri, created_at, updated_at
            )
            VALUES (
              ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders},
              NULL, NULL, NULL, ?, ?
            );
          `,
          [
            createEntityId(SAMPLE_ENTRY_ID_PREFIX),
            formatDateKey(consumed),
            consumed.toISOString(),
            food.name,
            food.quantityLabel,
            Math.round(food.quantityGrams * scale),
            Math.round(food.calories * scale),
            Math.round(food.protein * scale),
            Math.round(food.carbs * scale),
            Math.round(food.fat * scale),
            ...toNutrientParams(scaleNutrients(food.nutrients, scale)),
            createdAt,
            createdAt,
          ]
        );
        inserted += 1;
      }
    }
  });

  return inserted;
}

/** Removes every sample row added by {@link seedSampleFoodEntries}. */
export async function clearSampleFoodEntries() {
  const database = await getDatabase();
  const result = await database.runAsync('DELETE FROM food_entries WHERE id LIKE ?;', [
    `${SAMPLE_ENTRY_ID_PREFIX}-%`,
  ]);

  return result.changes;
}

import { getDatabase } from '@/services/database/sqlite';
import { clear as clearAppStorage } from '@/utils/storage';
import { clearManagedFoodEntryImageCache, deleteLocalFoodEntryImage } from './foodEntryImageSync';

interface LocalImageUriRow {
  image_uri: string | null;
  thumbnail_uri: string | null;
}

interface MealImageUriRow {
  local_uri: string | null;
  thumbnail_uri: string | null;
}

function isLocalFileUri(uri: string | null): uri is string {
  return typeof uri === 'string' && uri.startsWith('file://');
}

async function collectLocalUris() {
  const database = await getDatabase();
  const uris = new Set<string>();

  const rows = await Promise.all([
    database.getAllAsync<LocalImageUriRow>('SELECT image_uri, thumbnail_uri FROM food_entries;'),
    database.getAllAsync<LocalImageUriRow>('SELECT image_uri, thumbnail_uri FROM favorite_foods;'),
    database.getAllAsync<LocalImageUriRow>('SELECT image_uri, thumbnail_uri FROM meal_items;'),
    database.getAllAsync<MealImageUriRow>('SELECT local_uri, thumbnail_uri FROM meal_images;'),
    database.getAllAsync<LocalImageUriRow>(
      'SELECT image_uri, NULL AS thumbnail_uri FROM food_products;'
    ),
  ]);

  for (const rowSet of rows) {
    for (const row of rowSet) {
      if ('local_uri' in row) {
        if (isLocalFileUri(row.local_uri)) {
          uris.add(row.local_uri);
        }
      } else {
        if (isLocalFileUri(row.image_uri)) {
          uris.add(row.image_uri);
        }
      }

      if (isLocalFileUri(row.thumbnail_uri)) {
        uris.add(row.thumbnail_uri);
      }
    }
  }

  return [...uris];
}

async function deleteLocalFiles(uris: string[]) {
  await Promise.all(uris.map((uri) => deleteLocalFoodEntryImage(uri)));
}

async function clearLocalNutritionTables() {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM sync_queue;');
    await database.runAsync('DELETE FROM meal_images;');
    await database.runAsync('DELETE FROM meal_items;');
    await database.runAsync('DELETE FROM meals;');
    await database.runAsync('DELETE FROM favorite_foods;');
    await database.runAsync('DELETE FROM food_entries;');
    await database.runAsync('DELETE FROM daily_calorie_targets;');
    await database.runAsync('DELETE FROM user_profile;');
    await database.runAsync('DELETE FROM weight_goals;');
    await database.runAsync('DELETE FROM achievement_unlocks;');
    await database.runAsync('DELETE FROM food_products;');
    await database.runAsync('DELETE FROM app_device;');
  });
}

export async function resetLocalNutritionData() {
  const localUris = await collectLocalUris();
  await deleteLocalFiles(localUris);
  await clearManagedFoodEntryImageCache();
  await clearLocalNutritionTables();

  const clearResult = clearAppStorage();
  if (!clearResult.success) {
    throw clearResult.error ?? new Error('Failed to clear local app storage.');
  }
}

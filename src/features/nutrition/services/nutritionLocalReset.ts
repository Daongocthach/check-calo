import { supabase } from '@/integrations/supabase';
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

async function safeQuery<T>(database: Awaited<ReturnType<typeof getDatabase>>, sql: string) {
  try {
    return await database.getAllAsync<T>(sql);
  } catch {
    return [];
  }
}

async function collectLocalUris() {
  const database = await getDatabase();
  const uris = new Set<string>();

  const rows = await Promise.all([
    safeQuery<LocalImageUriRow>(database, 'SELECT image_uri, thumbnail_uri FROM food_entries;'),
    safeQuery<LocalImageUriRow>(database, 'SELECT image_uri, thumbnail_uri FROM recent_foods;'),
    safeQuery<LocalImageUriRow>(database, 'SELECT image_uri, thumbnail_uri FROM meal_items;'),
    safeQuery<MealImageUriRow>(database, 'SELECT local_uri, thumbnail_uri FROM meal_images;'),
    safeQuery<LocalImageUriRow>(
      database,
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

const NUTRITION_TABLES = [
  'sync_queue',
  'meal_images',
  'meal_items',
  'meals',
  'recent_foods',
  'food_entries',
  'daily_calorie_targets',
  'user_profile',
  'weight_goals',
  'achievement_unlocks',
  'food_products',
  'app_device',
] as const;

const SYNCED_NUTRITION_TABLES = [
  'sync_queue',
  'meal_images',
  'meal_items',
  'meals',
  'recent_foods',
  'food_entries',
] as const;

async function clearLocalNutritionTables(tables: readonly string[] = NUTRITION_TABLES) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const table of tables) {
      try {
        await database.runAsync(`DELETE FROM ${table};`);
      } catch {
        // Table may not exist yet — safe to skip
      }
    }
  });
}

/**
 * Full reset: wipes SQLite tables, local images, and MMKV storage.
 * Used for account deletion or full data reset from the profile screen.
 */
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

/**
 * Cloud reset: deletes nutrition data from Supabase for the current user.
 */
export async function resetCloudNutritionData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const tables = [
    'food_entries',
    'recent_foods',
    'meals',
    'meal_items',
    'meal_images',
    'profiles',
  ] as const;

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('user_id', user.id);
    } catch (error) {
      if (__DEV__) {
        console.error(`[CloudReset] Failed to delete from ${table}:`, error);
      }
    }
  }
}

/**
 * Global reset: wipes local database, images, MMKV, and cloud nutrition data.
 */
export async function resetAllNutritionData() {
  await resetLocalNutritionData();
  await resetCloudNutritionData();
}
/**
 * Login-safe reset: wipes only SQLite tables and local images.
 * Does NOT clear MMKV storage so the newly acquired session token is preserved.
 */
export async function resetLocalNutritionDataForLogin() {
  const localUris = await collectLocalUris();
  await deleteLocalFiles(localUris);
  await clearManagedFoodEntryImageCache();
  await clearLocalNutritionTables(SYNCED_NUTRITION_TABLES);
}

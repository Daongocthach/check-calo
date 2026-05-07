import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { ensureRemoteImage } from './foodEntryImageSync';

function hasSupabaseConfiguration() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function syncMealToCloud(mealLocalId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const database = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await database.getFirstAsync<any>('SELECT * FROM meals WHERE local_id = ? LIMIT 1;', [
    mealLocalId,
  ]);

  if (!row) return false;

  const { error } = await supabase.from('meals').upsert({
    id: row.local_id,
    user_id: userId,
    device_local_id: row.device_local_id,
    meal_type: row.meal_type,
    note: row.note,
    eaten_at: row.eaten_at,
    total_calories: row.total_calories,
    total_protein_grams: row.total_protein_grams,
    total_carbs_grams: row.total_carbs_grams,
    total_fat_grams: row.total_fat_grams,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  if (error && __DEV__) {
    console.warn('[MealSync] Failed to push meal:', error.message);
  }

  return !error;
}

export async function deleteMealFromCloud(mealLocalId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealLocalId)
    .eq('user_id', userId);

  return !error;
}

export async function syncMealItemToCloud(itemLocalId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const database = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM meal_items WHERE local_id = ? LIMIT 1;',
    [itemLocalId]
  );

  if (!row) return false;

  const isMealSynced = await syncMealToCloud(row.meal_local_id);

  if (!isMealSynced) {
    return false;
  }

  const remoteImageUri = await ensureRemoteImage(row.image_uri, row.local_id, 'meal-items');
  const remoteThumbnailUri =
    row.thumbnail_uri === row.image_uri
      ? remoteImageUri
      : await ensureRemoteImage(row.thumbnail_uri, row.local_id, 'meal-item-thumbs');

  const { error } = await supabase.from('meal_items').upsert({
    id: row.local_id,
    meal_id: row.meal_local_id,
    user_id: userId,
    device_local_id: row.device_local_id,
    source_key: row.source_key,
    title: row.title,
    quantity_label: row.quantity_label,
    quantity_grams: row.quantity_grams,
    servings: row.servings,
    total_calories: row.total_calories,
    protein_grams: row.protein_grams,
    carbs_grams: row.carbs_grams,
    fat_grams: row.fat_grams,
    notes: row.notes,
    image_uri: remoteImageUri,
    thumbnail_uri: remoteThumbnailUri,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  if (error && __DEV__) {
    console.warn('[MealSync] Failed to push meal item:', error.message);
  }

  return !error;
}

export async function deleteMealItemFromCloud(itemLocalId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('meal_items')
    .delete()
    .eq('id', itemLocalId)
    .eq('user_id', userId);

  return !error;
}

import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';

function hasSupabaseConfiguration() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function syncFoodEntryToCloud(entryId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const database = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM food_entries WHERE id = ? LIMIT 1;',
    [entryId]
  );

  if (!row) return false;

  const { error } = await supabase.from('food_entries').upsert({
    id: row.id,
    user_id: userId,
    entry_date: row.entry_date,
    consumed_at: row.consumed_at,
    meal_name: row.meal_name,
    quantity_label: row.quantity_label,
    quantity_grams: row.quantity_grams,
    total_calories: row.total_calories,
    protein_grams: row.protein_grams,
    carbs_grams: row.carbs_grams,
    fat_grams: row.fat_grams,
    notes: row.notes,
    image_uri: row.image_uri,
    thumbnail_uri: row.thumbnail_uri,
    barcode: row.barcode,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  if (error && __DEV__) {
    console.warn('[FoodEntrySync] Failed to push food entry:', error.message);
  }

  return !error;
}

export async function deleteFoodEntryFromCloud(entryId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('food_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);

  return !error;
}

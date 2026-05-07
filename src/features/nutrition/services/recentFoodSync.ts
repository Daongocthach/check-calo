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

export async function syncRecentFoodToCloud(recentId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const database = await getDatabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM recent_foods WHERE id = ? LIMIT 1;',
    [recentId]
  );

  if (!row) return false;

  const remoteImageUri = await ensureRemoteImage(row.image_uri, row.id, 'recent-foods');
  const remoteThumbnailUri =
    row.thumbnail_uri === row.image_uri
      ? remoteImageUri
      : await ensureRemoteImage(row.thumbnail_uri, row.id, 'recent-foods-thumbs');

  const { error } = await supabase.from('recent_foods').upsert({
    id: row.id,
    user_id: userId,
    source_entry_id: row.source_entry_id,
    name: row.name,
    quantity_label: row.quantity_label,
    quantity_grams: row.quantity_grams,
    total_calories: row.total_calories,
    protein_grams: row.protein_grams,
    carbs_grams: row.carbs_grams,
    fat_grams: row.fat_grams,
    notes: row.notes,
    image_uri: remoteImageUri,
    thumbnail_uri: remoteThumbnailUri,
    barcode: row.barcode,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  if (error && __DEV__) {
    console.log('[RecentSync] Failed to push recent food:', error.message);
  }

  return !error;
}

export async function deleteRecentFoodFromCloud(recentId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('recent_foods')
    .delete()
    .eq('id', recentId)
    .eq('user_id', userId);

  return !error;
}

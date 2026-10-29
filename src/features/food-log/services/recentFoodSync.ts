import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { pickNutrientColumns } from '../utils/nutrients';
import type { RecentFoodRow } from './foodEntryRepositoryCore';
import { deleteOrphanedFoodEntryAssets, ensureRemoteImage } from './foodImageStorage';

function hasSupabaseConfiguration() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

const pendingSyncs = new Map<string, Promise<boolean>>();

/**
 * Pushes a recent food to the cloud. Syncs for the same id run one after another so a
 * second call sees the remote image URIs written back by the first instead of uploading again.
 */
export function syncRecentFoodToCloud(recentId: string) {
  const previous = pendingSyncs.get(recentId) ?? Promise.resolve(true);
  const next = previous.catch(() => false).then(() => pushRecentFoodToCloud(recentId));
  const clear = () => {
    if (pendingSyncs.get(recentId) === next) pendingSyncs.delete(recentId);
  };

  pendingSyncs.set(recentId, next);
  void next.then(clear, clear);

  return next;
}

/**
 * Points the local row at the uploaded copies so later syncs skip the upload, then drops
 * local files nothing references anymore. Only replaces a URI the row still holds.
 */
async function storeRemoteImageUris(
  row: RecentFoodRow,
  remoteImageUri: string | null,
  remoteThumbnailUri: string | null
) {
  const imageChanged = remoteImageUri !== row.image_uri;
  const thumbnailChanged = remoteThumbnailUri !== row.thumbnail_uri;

  if (!imageChanged && !thumbnailChanged) return;

  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    if (imageChanged) {
      await database.runAsync(
        'UPDATE recent_foods SET image_uri = ? WHERE id = ? AND image_uri IS ?;',
        [remoteImageUri, row.id, row.image_uri]
      );
    }

    if (thumbnailChanged) {
      await database.runAsync(
        'UPDATE recent_foods SET thumbnail_uri = ? WHERE id = ? AND thumbnail_uri IS ?;',
        [remoteThumbnailUri, row.id, row.thumbnail_uri]
      );
    }
  });

  await deleteOrphanedFoodEntryAssets(
    imageChanged ? row.image_uri : null,
    thumbnailChanged ? row.thumbnail_uri : null
  );
}

async function pushRecentFoodToCloud(recentId: string) {
  if (!hasSupabaseConfiguration()) return false;
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const database = await getDatabase();
  const row = await database.getFirstAsync<RecentFoodRow>(
    'SELECT * FROM recent_foods WHERE id = ? LIMIT 1;',
    [recentId]
  );

  if (!row) return false;

  const remoteImageUri = await ensureRemoteImage(row.image_uri, row.id, 'recent-foods');
  const remoteThumbnailUri =
    row.thumbnail_uri === row.image_uri
      ? remoteImageUri
      : await ensureRemoteImage(row.thumbnail_uri, row.id, 'recent-foods-thumbs');

  await storeRemoteImageUris(row, remoteImageUri, remoteThumbnailUri);

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
    ...pickNutrientColumns(row),
    notes: row.notes,
    image_uri: remoteImageUri,
    thumbnail_uri: remoteThumbnailUri,
    barcode: row.barcode,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  if (error && __DEV__) {
    console.warn('[RecentSync] Failed to push recent food:', error.message);
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

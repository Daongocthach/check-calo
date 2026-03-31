import * as FileSystem from 'expo-file-system/legacy';
import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { STORAGE_KEYS, getItem } from '@/utils/storage';
import type { FoodEntry } from '../types';
import { getFoodEntryById, replaceImageUriReferences } from './nutritionDatabase';

const FOOD_ENTRY_IMAGE_DIRECTORY = `${FileSystem.documentDirectory ?? ''}food-entry-images/`;
const SUPABASE_FOOD_ENTRIES_TABLE = 'food_entries';

function isLocalFileUri(uri: string | null | undefined): uri is string {
  return typeof uri === 'string' && uri.startsWith('file://');
}

function getFileExtension(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function toStorageContentType(uri: string) {
  switch (getFileExtension(uri)) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function buildManagedImageUri(sourceUri: string) {
  return `${FOOD_ENTRY_IMAGE_DIRECTORY}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${getFileExtension(sourceUri)}`;
}

async function ensureManagedImageDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is unavailable');
  }

  await FileSystem.makeDirectoryAsync(FOOD_ENTRY_IMAGE_DIRECTORY, {
    intermediates: true,
  });
}

async function getAuthenticatedUserId() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user?.id ?? null;
}

export async function hasAuthenticatedSupabaseUser() {
  const userId = await getAuthenticatedUserId();
  return Boolean(userId);
}

function buildRemoteImagePath(userId: string, entryId: string, localUri: string) {
  return `users/${userId}/food-entries/${entryId}.${getFileExtension(localUri)}`;
}

function buildRemoteImageUri(path: string) {
  return supabase.storage.from(env.supabaseFoodImageBucket).getPublicUrl(path).data.publicUrl;
}

async function uploadLocalImage(localUri: string, remotePath: string) {
  const response = await fetch(localUri);
  const fileBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(env.supabaseFoodImageBucket)
    .upload(remotePath, fileBuffer, {
      contentType: toStorageContentType(localUri),
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

async function upsertRemoteFoodEntry(entry: FoodEntry, userId: string, imageUri: string | null) {
  const deviceLocalId = getItem<string>(STORAGE_KEYS.device.localId);

  const { error } = await supabase.from(SUPABASE_FOOD_ENTRIES_TABLE).upsert(
    {
      id: entry.id,
      user_id: userId,
      device_local_id: deviceLocalId.success ? (deviceLocalId.data ?? null) : null,
      entry_date: entry.entryDate,
      consumed_at: entry.consumedAt,
      meal_name: entry.mealName,
      quantity_label: entry.quantityLabel,
      quantity_grams: entry.quantityGrams,
      total_calories: entry.totalCalories,
      protein_grams: entry.proteinGrams,
      carbs_grams: entry.carbsGrams,
      fat_grams: entry.fatGrams,
      notes: entry.notes,
      image_uri: imageUri,
      updated_at: entry.updatedAt,
      created_at: entry.createdAt,
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw error;
  }
}

export async function persistFoodEntryImageLocally(imageUri: string) {
  if (!isLocalFileUri(imageUri) || imageUri.startsWith(FOOD_ENTRY_IMAGE_DIRECTORY)) {
    return imageUri;
  }

  await ensureManagedImageDirectory();

  const destinationUri = buildManagedImageUri(imageUri);
  await FileSystem.copyAsync({
    from: imageUri,
    to: destinationUri,
  });

  return destinationUri;
}

export async function deleteLocalFoodEntryImage(imageUri: string | null | undefined) {
  if (!isLocalFileUri(imageUri)) {
    return;
  }

  await FileSystem.deleteAsync(imageUri, {
    idempotent: true,
  });
}

export async function syncFoodEntryImageToSupabase(entryId: string) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return false;
  }

  const entry = await getFoodEntryById(entryId);

  if (!entry) {
    return false;
  }

  let syncedImageUri = entry.imageUri ?? null;

  if (isLocalFileUri(entry.imageUri)) {
    const remotePath = buildRemoteImagePath(userId, entry.id, entry.imageUri);
    await uploadLocalImage(entry.imageUri, remotePath);
    syncedImageUri = buildRemoteImageUri(remotePath);
    await replaceImageUriReferences(entry.imageUri, syncedImageUri);
    await deleteLocalFoodEntryImage(entry.imageUri);
  }

  const refreshedEntry = (await getFoodEntryById(entryId)) ?? entry;
  await upsertRemoteFoodEntry(refreshedEntry, userId, syncedImageUri);

  return true;
}

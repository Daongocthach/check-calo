import type { FoodEntry, FoodEntryInput, NutrientValues } from '../types';
import { pickNutrients } from '../utils/nutrients';
import { createFoodEntry, deleteFoodEntry, updateFoodEntry } from './foodEntryRepository';
import { getFoodEntryById } from './foodEntryRepositoryCore';
import { deleteOrphanedFoodEntryAssets, persistFoodEntryAssetsLocally } from './foodImageStorage';
import {
  enqueueFoodEntryImageSync,
  processPendingFoodEntryImageSyncQueue,
} from './foodImageSyncQueue';
import { createFoodEntryFromRecent, upsertRecentFoodFromInput } from './recentFoodRepository';

export interface LogFoodItemInput extends Partial<NutrientValues> {
  name: string;
  quantityLabel: string;
  quantityGrams: number | null;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  barcode?: string | null;
}

export interface LogFoodOptions {
  /** Photo shared with the chat message; attached to every logged item. */
  imageUri?: string | null;
  consumedAt?: string;
}

function toEntryInput(
  item: LogFoodItemInput,
  assets: { imageUri: string; thumbnailUri: string } | null,
  consumedAt: string
): FoodEntryInput {
  return {
    barcode: item.barcode ?? null,
    mealName: item.name,
    quantityLabel: item.quantityLabel,
    quantityGrams: item.quantityGrams,
    totalCalories: item.calories,
    proteinGrams: item.proteinGrams,
    carbsGrams: item.carbsGrams,
    fatGrams: item.fatGrams,
    ...pickNutrients(item),
    notes: item.notes ?? null,
    imageUri: assets?.imageUri ?? null,
    thumbnailUri: assets?.thumbnailUri ?? null,
    consumedAt,
  };
}

async function queueImageSync(entry: FoodEntry) {
  if (entry.imageUri?.startsWith('file://')) {
    await enqueueFoodEntryImageSync(entry.id);
  }
}

/**
 * Saves food items to the diary (`food_entries`), keeps `recent_foods` in sync for quick re-logging,
 * and queues photo uploads. Cloud sync runs through the existing background queue.
 */
export async function logFoodItems(items: LogFoodItemInput[], options: LogFoodOptions = {}) {
  const consumedAt = options.consumedAt ?? new Date().toISOString();
  const assets = options.imageUri ? await persistFoodEntryAssetsLocally(options.imageUri) : null;
  const entries: FoodEntry[] = [];

  for (const item of items) {
    const entry = await createFoodEntry(toEntryInput(item, assets, consumedAt));
    entries.push(entry);
    await queueImageSync(entry);

    await upsertRecentFoodFromInput({
      name: item.name,
      barcode: item.barcode ?? null,
      quantityLabel: item.quantityLabel,
      quantityGrams: item.quantityGrams,
      totalCalories: item.calories,
      proteinGrams: item.proteinGrams,
      carbsGrams: item.carbsGrams,
      fatGrams: item.fatGrams,
      ...pickNutrients(item),
      notes: item.notes ?? null,
      imageUri: assets?.imageUri ?? null,
      thumbnailUri: assets?.thumbnailUri ?? null,
    });
  }

  void processPendingFoodEntryImageSyncQueue();

  return entries;
}

/** Re-logs a recent food as a new diary entry, reusing its saved photo. */
export async function logRecentFood(recentId: string) {
  const entry = await createFoodEntryFromRecent(recentId);
  await queueImageSync(entry);
  void processPendingFoodEntryImageSyncQueue();

  return entry;
}

export async function updateLoggedFood(entryId: string, input: FoodEntryInput) {
  const entry = await updateFoodEntry(entryId, input);

  if (entry) {
    await queueImageSync(entry);
    void processPendingFoodEntryImageSyncQueue();
  }

  return entry;
}

export async function removeLoggedFood(entryId: string) {
  const entry = await getFoodEntryById(entryId);
  await deleteFoodEntry(entryId);

  if (entry) {
    await deleteOrphanedFoodEntryAssets(entry.imageUri, entry.thumbnailUri);
  }
}

import type { WeightGoalMode } from '@/features/goals/types';

export type SyncQueueEntityType =
  | 'meal'
  | 'meal_item'
  | 'meal_image'
  | 'delete_meal'
  | 'delete_meal_image';
export type SyncQueueOperation = 'create' | 'update' | 'delete' | 'upload';
export type SyncQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

/** Nutrients tracked beyond calories and macros. Grams unless the key ends in `Mg`. */
export type NutrientKey =
  | 'fiberGrams'
  | 'sugarGrams'
  | 'saturatedFatGrams'
  | 'transFatGrams'
  | 'cholesterolMg'
  | 'sodiumMg'
  | 'potassiumMg';

/** `null` means unknown (not estimated or not on the label), which is different from 0. */
export type NutrientValues = Record<NutrientKey, number | null>;

export interface DailyNutritionSummary {
  date: string;
  calorieTarget: number;
  /** The goal the day is judged by: the one it was logged under. */
  goalMode: WeightGoalMode;
  consumedCalories: number;
  remainingCalories: number;
  progressPercent: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Sum of the known values that day; `null` when no entry had the nutrient. */
  nutrients: NutrientValues;
}

export interface NutritionTrendPoint extends DailyNutritionSummary {
  label: string;
}

export interface FoodEntryInput extends Partial<NutrientValues> {
  barcode?: string | null;
  mealName: string;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
  thumbnailUri?: string | null;
  consumedAt?: string;
  entryDate?: string;
}

export interface FoodEntry extends Omit<FoodEntryInput, NutrientKey>, NutrientValues {
  id: string;
  consumedAt: string;
  entryDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isRecent: boolean;
}

export interface RecentFood extends NutrientValues {
  id: string;
  sourceEntryId: string | null;
  barcode: string | null;
  name: string;
  quantityLabel: string;
  quantityGrams: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  imageUri: string | null;
  thumbnailUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueRecord {
  id: string;
  entityType: SyncQueueEntityType;
  entityLocalId: string;
  operation: SyncQueueOperation;
  priority: number;
  status: SyncQueueStatus;
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  payloadJson: string | null;
  createdAt: string;
  updatedAt: string;
}

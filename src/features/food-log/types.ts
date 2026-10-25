export type SyncQueueEntityType =
  | 'meal'
  | 'meal_item'
  | 'meal_image'
  | 'delete_meal'
  | 'delete_meal_image';
export type SyncQueueOperation = 'create' | 'update' | 'delete' | 'upload';
export type SyncQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface DailyNutritionSummary {
  date: string;
  calorieTarget: number;
  consumedCalories: number;
  remainingCalories: number;
  progressPercent: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface NutritionTrendPoint extends DailyNutritionSummary {
  label: string;
}

export interface FoodEntryInput {
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

export interface FoodEntry extends FoodEntryInput {
  id: string;
  consumedAt: string;
  entryDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isRecent: boolean;
}

export interface RecentFood {
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

export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type SyncOwnerType = 'device' | 'user';
export type MealSyncStatus = 'local_only' | 'pending' | 'syncing' | 'synced' | 'failed';
export type MealImageUploadStatus =
  | 'local_only'
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'deleted_local';
export type SyncQueueEntityType =
  | 'meal'
  | 'meal_item'
  | 'meal_image'
  | 'delete_meal'
  | 'delete_meal_image';
export type SyncQueueOperation = 'create' | 'update' | 'delete' | 'upload';
export type SyncQueueStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface UserProfileInput {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}

export interface UserProfile extends UserProfileInput {
  id: number;
  activityFactor: number;
  bmi: number;
  dailyCalorieTarget: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTargetOverride {
  date: string;
  calorieTarget: number;
  source: 'profile' | 'manual';
  createdAt: string;
  updatedAt: string;
}

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
  mealName: string;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
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
  isFavorite: boolean;
}

export interface FavoriteFood {
  id: string;
  sourceEntryId: string | null;
  name: string;
  quantityLabel: string;
  quantityGrams: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  imageUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppDevice {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecord {
  localId: string;
  remoteId: string | null;
  ownerType: SyncOwnerType;
  deviceLocalId: string;
  userId: string | null;
  mealType: MealType;
  note: string | null;
  eatenAt: string;
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  syncStatus: MealSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MealImageRecord {
  localId: string;
  remoteId: string | null;
  mealLocalId: string;
  mealRemoteId: string | null;
  ownerType: SyncOwnerType;
  deviceLocalId: string;
  userId: string | null;
  localUri: string | null;
  thumbnailUri: string | null;
  remotePath: string | null;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  uploadStatus: MealImageUploadStatus;
  uploadError: string | null;
  lastUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MealItemRecord {
  localId: string;
  remoteId: string | null;
  mealLocalId: string;
  mealRemoteId: string | null;
  ownerType: SyncOwnerType;
  deviceLocalId: string;
  userId: string | null;
  sourceKey: string | null;
  title: string;
  quantityLabel: string;
  quantityGrams: number | null;
  servings: number;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

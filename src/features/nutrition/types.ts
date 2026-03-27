export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

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
  createdAt: string;
  updatedAt: string;
}

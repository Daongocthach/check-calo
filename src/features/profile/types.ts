export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfileInput {
  displayName: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  // Positive = lose weight, zero = maintain, negative = gain weight.
  monthlyWeightGoalKg: number;
  activityLevel: ActivityLevel;
}

export interface UserProfile extends UserProfileInput {
  id: number;
  activityFactor: number;
  bmi: number;
  maintenanceCalorieTarget: number;
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
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

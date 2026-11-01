import type { WeightGoalMode } from '@/features/goals/types';

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
  /** Null when maintaining, or for profiles saved before target weights existed. */
  targetWeightKg: number | null;
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
  /**
   * YYYY-MM-DD the maintenance phase ends after switching between losing and gaining; the
   * goal's calories apply from that day. Null outside a transition.
   */
  transitionUntil: string | null;
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

/** The calorie and macro targets and the goal a day is judged by. */
export interface DayPlan {
  calorieTarget: number;
  goalMode: WeightGoalMode;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatTargetGrams: number;
}

/**
 * A plan as saved for one day. A manual target saved without a goal has a null mode; plans
 * saved before macro targets were kept per day have null macros.
 */
export interface DailyTargetRecord {
  date: string;
  calorieTarget: number;
  proteinTargetGrams: number | null;
  carbsTargetGrams: number | null;
  fatTargetGrams: number | null;
  goalMode: WeightGoalMode | null;
  source: DailyTargetOverride['source'];
  createdAt: string;
  updatedAt: string;
}

import type { WeightGoalMode } from '@/features/goals/types';
import { ACTIVITY_LEVEL_FACTORS } from '../constants';
import type { ActivityLevel, Gender, UserProfileInput } from '../types';

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30;
const MAINTENANCE_TOLERANCE_KCAL = 100;
export type DailyCalorieGoalState = 'below_target' | 'on_target' | 'above_target';

export function getActivityFactor(activityLevel: ActivityLevel) {
  return ACTIVITY_LEVEL_FACTORS[activityLevel];
}

export function calculateBmi(heightCm: number, weightKg: number) {
  const heightInMeters = heightCm / 100;
  return weightKg / (heightInMeters * heightInMeters);
}

export function calculateMaintenanceCalorieTarget(profile: UserProfileInput) {
  const baseBmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  const genderAdjustment: Record<Gender, number> = {
    male: 5,
    female: -161,
    other: -78,
  };

  return Math.round(
    (baseBmr + genderAdjustment[profile.gender]) * getActivityFactor(profile.activityLevel)
  );
}

export function calculateDailyCalorieTarget(profile: UserProfileInput) {
  const maintenanceCalories = calculateMaintenanceCalorieTarget(profile);

  if (profile.monthlyWeightGoalKg === 0) {
    return maintenanceCalories;
  }

  const dailyAdjustment = Math.round(
    (Math.abs(profile.monthlyWeightGoalKg) * KCAL_PER_KG) / DAYS_PER_MONTH
  );

  if (profile.monthlyWeightGoalKg > 0) {
    return Math.max(1200, maintenanceCalories - dailyAdjustment);
  }

  return maintenanceCalories + dailyAdjustment;
}

export function calculateMacroTargets(profile: UserProfileInput) {
  const dailyCalorieTarget = calculateDailyCalorieTarget(profile);
  const proteinTargetGrams = Math.round(Math.max(profile.weightKg * 1.8, 60));
  const fatTargetGrams = Math.round(
    Math.max(profile.weightKg * 0.8, (dailyCalorieTarget * 0.25) / 9)
  );
  const carbsTargetGrams = Math.max(
    0,
    Math.round((dailyCalorieTarget - proteinTargetGrams * 4 - fatTargetGrams * 9) / 4)
  );

  return {
    proteinTargetGrams,
    carbsTargetGrams,
    fatTargetGrams,
  };
}

export function getWeightGoalMode(monthlyWeightGoalKg: number): WeightGoalMode {
  if (monthlyWeightGoalKg > 0) {
    return 'lose';
  }

  if (monthlyWeightGoalKg < 0) {
    return 'gain';
  }

  return 'maintain';
}

export function getDailyCalorieGoalState(
  profile: Pick<UserProfileInput, 'monthlyWeightGoalKg'> | null | undefined,
  calorieTarget: number,
  consumedCalories: number
): DailyCalorieGoalState {
  if (calorieTarget <= 0) {
    return 'below_target';
  }

  const goalMode = getWeightGoalMode(profile?.monthlyWeightGoalKg ?? 0);
  const calorieDelta = consumedCalories - calorieTarget;

  if (goalMode === 'lose') {
    return calorieDelta > 0 ? 'above_target' : 'on_target';
  }

  if (goalMode === 'gain') {
    return calorieDelta < 0 ? 'below_target' : 'on_target';
  }

  if (Math.abs(calorieDelta) <= MAINTENANCE_TOLERANCE_KCAL) {
    return 'on_target';
  }

  return calorieDelta < 0 ? 'below_target' : 'above_target';
}

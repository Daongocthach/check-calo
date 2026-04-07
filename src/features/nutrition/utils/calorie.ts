import { ACTIVITY_LEVEL_FACTORS } from '../constants';
import type { ActivityLevel, Gender, UserProfileInput } from '../types';

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30;

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

  if (profile.monthlyWeightLossKg <= 0) {
    return maintenanceCalories;
  }

  const dailyAdjustment = Math.round((profile.monthlyWeightLossKg * KCAL_PER_KG) / DAYS_PER_MONTH);

  return Math.max(1200, maintenanceCalories - dailyAdjustment);
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

export function formatDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function nowIsoString() {
  return new Date().toISOString();
}

export function createEntityId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

import type { WeightGoalMode } from '@/features/goals/types';
import { ACTIVITY_LEVEL_FACTORS } from '../constants';
import type { ActivityLevel, Gender, UserProfileInput } from '../types';
import { usesLegacyGoalRules } from './goalRules';

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30;
const MAINTENANCE_TOLERANCE_KCAL = 100;
/** A deficit never goes beyond this share of maintenance calories. */
const MAX_DEFICIT_RATIO = 0.25;
/** A surplus above this mostly turns into fat. */
export const MAX_SURPLUS_KCAL = 500;
/** Lowest daily target a weight-loss plan may set, before the BMR check. */
const MIN_DAILY_CALORIES: Record<Gender, number> = {
  male: 1500,
  female: 1200,
  other: 1350,
};
const PROTEIN_GRAMS_PER_KG: Record<WeightGoalMode, number> = {
  lose: 2,
  maintain: 1.6,
  gain: 1.8,
};
const MIN_PROTEIN_GRAMS = 60;
const FAT_GRAMS_PER_KG = 0.8;
/** Above this BMI, protein and fat are sized from the weight at this BMI instead. */
const MACRO_REFERENCE_BMI = 25;
/** How far below and above the daily target still counts as on target. */
const CALORIE_RANGE_KCAL: Record<WeightGoalMode, { below: number; above: number }> = {
  lose: { below: 200, above: 100 },
  maintain: { below: 150, above: 150 },
  gain: { below: 100, above: 250 },
};

export type DailyCalorieGoalState = 'below_target' | 'on_target' | 'above_target';

export interface CalorieRange {
  min: number;
  max: number;
}

type BodyProfile = Pick<UserProfileInput, 'gender' | 'age' | 'heightCm' | 'weightKg'>;
/** Everything the calorie math needs except the goal. */
export type BodyStats = BodyProfile & Pick<UserProfileInput, 'activityLevel'>;

export function getActivityFactor(activityLevel: ActivityLevel) {
  return ACTIVITY_LEVEL_FACTORS[activityLevel];
}

export function calculateBmi(heightCm: number, weightKg: number) {
  const heightInMeters = heightCm / 100;
  return weightKg / (heightInMeters * heightInMeters);
}

/** Mifflin-St Jeor resting energy expenditure. */
export function calculateBmr(profile: BodyProfile) {
  const baseBmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  const genderAdjustment: Record<Gender, number> = {
    male: 5,
    female: -161,
    other: -78,
  };

  return baseBmr + genderAdjustment[profile.gender];
}

export function calculateMaintenanceCalorieTarget(profile: BodyStats) {
  return Math.round(calculateBmr(profile) * getActivityFactor(profile.activityLevel));
}

/** The lowest daily target a weight-loss plan may set: never below BMR. */
export function getCalorieFloor(profile: BodyProfile) {
  return Math.max(MIN_DAILY_CALORIES[profile.gender], Math.round(calculateBmr(profile)));
}

export function calculateDailyCalorieTarget(profile: UserProfileInput) {
  const maintenanceCalories = calculateMaintenanceCalorieTarget(profile);
  const goalMode = getWeightGoalMode(profile.monthlyWeightGoalKg);

  if (goalMode === 'maintain') {
    return maintenanceCalories;
  }

  const dailyAdjustment = Math.round(
    (Math.abs(profile.monthlyWeightGoalKg) * KCAL_PER_KG) / DAYS_PER_MONTH
  );

  if (goalMode === 'gain') {
    return maintenanceCalories + Math.min(dailyAdjustment, MAX_SURPLUS_KCAL);
  }

  const deficit = Math.min(dailyAdjustment, Math.round(maintenanceCalories * MAX_DEFICIT_RATIO));
  return Math.max(getCalorieFloor(profile), maintenanceCalories - deficit);
}

/** The largest daily deficit a weight-loss plan may use: a share of maintenance, above the floor. */
export function getMaxDailyDeficit(profile: BodyStats) {
  const maintenanceCalories = calculateMaintenanceCalorieTarget(profile);

  return Math.max(
    0,
    Math.min(
      Math.round(maintenanceCalories * MAX_DEFICIT_RATIO),
      maintenanceCalories - getCalorieFloor(profile)
    )
  );
}

export function calculateMacroTargets(profile: UserProfileInput) {
  const dailyCalorieTarget = calculateDailyCalorieTarget(profile);
  const goalMode = getWeightGoalMode(profile.monthlyWeightGoalKg);
  const heightInMeters = profile.heightCm / 100;
  const referenceWeightKg = Math.min(
    profile.weightKg,
    MACRO_REFERENCE_BMI * heightInMeters * heightInMeters
  );
  const proteinTargetGrams = Math.round(
    Math.max(referenceWeightKg * PROTEIN_GRAMS_PER_KG[goalMode], MIN_PROTEIN_GRAMS)
  );
  const fatTargetGrams = Math.round(
    Math.max(referenceWeightKg * FAT_GRAMS_PER_KG, (dailyCalorieTarget * 0.25) / 9)
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

/** Calories that count as on target for a day, around that day's target. */
export function getCalorieRange(
  profile: UserProfileInput | null | undefined,
  calorieTarget: number
): CalorieRange {
  const goalMode = getWeightGoalMode(profile?.monthlyWeightGoalKg ?? 0);
  const { below, above } = CALORIE_RANGE_KCAL[goalMode];
  // A manual target may sit under the floor; the range still has to contain it.
  const floor =
    goalMode === 'lose' && profile ? Math.min(getCalorieFloor(profile), calorieTarget) : 0;

  return {
    min: Math.max(floor, calorieTarget - below),
    max: calorieTarget + above,
  };
}

function getLegacyDailyCalorieGoalState(
  goalMode: WeightGoalMode,
  calorieDelta: number
): DailyCalorieGoalState {
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

/**
 * Whether a day's intake is under, within or over its calorie range. Days before the
 * range rules started (see goalRules) keep the old one-sided check.
 */
export function getDailyCalorieGoalState(
  profile: UserProfileInput | null | undefined,
  calorieTarget: number,
  consumedCalories: number,
  dateKey?: string
): DailyCalorieGoalState {
  if (calorieTarget <= 0) {
    return 'below_target';
  }

  if (dateKey && usesLegacyGoalRules(dateKey)) {
    return getLegacyDailyCalorieGoalState(
      getWeightGoalMode(profile?.monthlyWeightGoalKg ?? 0),
      consumedCalories - calorieTarget
    );
  }

  const range = getCalorieRange(profile, calorieTarget);

  if (consumedCalories < range.min) {
    return 'below_target';
  }

  return consumedCalories > range.max ? 'above_target' : 'on_target';
}

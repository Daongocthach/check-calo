import type { DailyNutritionSummary } from '@/features/food-log/types';
import type { UserProfileInput } from '@/features/profile/types';
import { getCalorieRange, getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import {
  CALORIE_SCORE_FALLOFF,
  FIBER_GRAMS_PER_1000_KCAL,
  FIBER_TARGET_RANGE,
  LATE_NIGHT_PENALTY,
  MAIN_MEALS_PER_DAY,
  NUTRIENT_COVERAGE_MIN,
  NUTRIENT_LIMITS,
  SATURATED_FAT_MAX_SHARE,
} from '../constants/stats';
import type { AxisScores, DayMeals } from '../types';

export interface DayScoreInput {
  summary: DailyNutritionSummary;
  meals: DayMeals;
  /** Share of the day's calories from food with fiber, sugar or sodium known (0-1). */
  nutrientCoverage: number;
}

function clampScore(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function average(values: (number | null)[]) {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0) / known.length;
}

/** Fiber for a day planned at `calorieTarget` kcal. */
export function getFiberTarget(calorieTarget: number) {
  const scaled = (calorieTarget / 1000) * FIBER_GRAMS_PER_1000_KCAL;
  return Math.round(Math.min(FIBER_TARGET_RANGE.max, Math.max(FIBER_TARGET_RANGE.min, scaled)));
}

/** Saturated fat limit in grams for a day planned at `calorieTarget` kcal. */
export function getSaturatedFatLimit(calorieTarget: number) {
  return calorieTarget > 0 ? (calorieTarget * SATURATED_FAT_MAX_SHARE) / 9 : null;
}

/** 100 up to the limit, then down to 0 at twice the limit. */
function scoreLimit(value: number | null, limit: number | null) {
  if (value === null || limit === null || limit <= 0) {
    return null;
  }

  return value <= limit ? 100 : clampScore(100 * (1 - (value - limit) / limit));
}

/** How much of a target was reached, at most all of it; null without a target. */
function reached(value: number, target: number) {
  return target > 0 ? Math.min(1, value / target) : null;
}

function scoreCalories(summary: DailyNutritionSummary, profile: UserProfileInput | null) {
  const { calorieTarget, consumedCalories, date, goalMode } = summary;

  if (calorieTarget <= 0) {
    return null;
  }

  if (
    getDailyCalorieGoalState(profile, calorieTarget, consumedCalories, date, goalMode) ===
    'on_target'
  ) {
    return 100;
  }

  const range = getCalorieRange(profile, calorieTarget, goalMode);
  const distance =
    consumedCalories < range.min ? range.min - consumedCalories : consumedCalories - range.max;

  return clampScore(100 * (1 - Math.max(0, distance) / (calorieTarget * CALORIE_SCORE_FALLOFF)));
}

/** Protein, carbs and fat each against the day's target; eating more than that adds nothing. */
function scoreNutrients(summary: DailyNutritionSummary) {
  const share = average([
    reached(summary.proteinGrams, summary.proteinTargetGrams),
    reached(summary.carbsGrams, summary.carbsTargetGrams),
    reached(summary.fatGrams, summary.fatTargetGrams),
  ]);

  return share === null ? null : clampScore(100 * share);
}

/** Enough fiber and staying under the limits, on a day with enough nutrient data. */
function scoreQuality(summary: DailyNutritionSummary, nutrientCoverage: number) {
  if (nutrientCoverage < NUTRIENT_COVERAGE_MIN) {
    return null;
  }

  const { nutrients, calorieTarget } = summary;
  const fiber = nutrients.fiberGrams;
  const limits = average([
    scoreLimit(nutrients.sugarGrams, NUTRIENT_LIMITS.sugarGrams),
    scoreLimit(nutrients.sodiumMg, NUTRIENT_LIMITS.sodiumMg),
    scoreLimit(nutrients.transFatGrams, NUTRIENT_LIMITS.transFatGrams),
    scoreLimit(nutrients.cholesterolMg, NUTRIENT_LIMITS.cholesterolMg),
    scoreLimit(nutrients.saturatedFatGrams, getSaturatedFatLimit(calorieTarget)),
  ]);
  const score = average([
    fiber === null ? null : 100 * Math.min(1, fiber / getFiberTarget(calorieTarget)),
    limits,
  ]);

  return score === null ? null : clampScore(score);
}

/** Main meals on time, less a penalty for eating late at night. */
function scoreTiming(meals: DayMeals) {
  if (meals.main === 0) {
    return meals.lateNight ? 0 : null;
  }

  return clampScore((100 * meals.onTime) / meals.main - (meals.lateNight ? LATE_NIGHT_PENALTY : 0));
}

/**
 * Scores one day 0-100 on every stat, judged by the day's own plan. A stat the day has no
 * data for is null; a day with nothing logged only counts against consistency.
 */
export function scoreDay(
  { summary, meals, nutrientCoverage }: DayScoreInput,
  profile: UserProfileInput | null
): AxisScores {
  if (summary.consumedCalories <= 0) {
    return {
      calories: null,
      nutrients: null,
      quality: null,
      timing: null,
      meals: null,
      consistency: 0,
    };
  }

  return {
    calories: scoreCalories(summary, profile),
    nutrients: scoreNutrients(summary),
    quality: scoreQuality(summary, nutrientCoverage),
    timing: scoreTiming(meals),
    meals: clampScore((100 * meals.main) / MAIN_MEALS_PER_DAY),
    consistency: 100,
  };
}

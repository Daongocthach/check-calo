import {
  calculateDailyCalorieTarget,
  calculateMaintenanceCalorieTarget,
  getMaxDailyDeficit,
  MAX_SURPLUS_KCAL,
  type BodyStats,
} from '@/features/profile/utils/calorie';
import type { WeightGoalMode } from '../types';
import { roundKg } from './weightGoal';

const KCAL_PER_KG = 7700;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
/** Shorter goals mostly move water, which the weekly trend weight cannot see yet. */
export const MIN_GOAL_WEEKS = 4;
/** Longer changes are split into stages, each a goal of its own. */
export const MAX_GOAL_WEEKS = 52;
/** Fastest weekly change as a share of body weight. */
const MAX_WEEKLY_SHARE: Record<Exclude<WeightGoalMode, 'maintain'>, number> = {
  lose: 0.01,
  gain: 0.005,
};
/** Slower than this, the daily gap hides inside logging and scale noise. */
const MIN_MONTHLY_RATE_KG: Record<Exclude<WeightGoalMode, 'maintain'>, number> = {
  lose: 0.5,
  gain: 0.25,
};
/** Lightest and heaviest target weights the sliders offer. */
const TARGET_WEIGHT_LIMITS = { min: 25, max: 160 };
/** The default plan runs at this share of the fastest rate. */
const DEFAULT_PACE_SHARE = 0.6;

export type GoalPace = 'gentle' | 'moderate' | 'fast';

export interface GoalDurationBounds {
  mode: WeightGoalMode;
  /** Kilograms between the current and the target weight. */
  changeKg: number;
  /** Fastest safe change for this body, in kg per week. */
  maxWeeklyRateKg: number;
  minWeeks: number;
  maxWeeks: number;
}

export interface GoalDurationPlan {
  mode: WeightGoalMode;
  weeks: number;
  weeklyRateKg: number;
  /** Positive = lose, negative = gain, the sign UserProfileInput uses. */
  monthlyWeightGoalKg: number;
  dailyCalories: number;
  maintenanceCalories: number;
  pace: GoalPace;
}

export function getPlanMode(weightKg: number, targetWeightKg: number): WeightGoalMode {
  const change = roundKg(targetWeightKg - weightKg);

  if (change < 0) return 'lose';
  if (change > 0) return 'gain';
  return 'maintain';
}

/** Fastest safe change in kg per week: the calorie limits and a share of body weight. */
export function getMaxWeeklyRateKg(body: BodyStats, mode: WeightGoalMode) {
  if (mode === 'maintain') {
    return 0;
  }

  const dailyKcal = mode === 'lose' ? getMaxDailyDeficit(body) : MAX_SURPLUS_KCAL;
  const byCalories = (dailyKcal * DAYS_PER_WEEK) / KCAL_PER_KG;

  return Math.min(byCalories, body.weightKg * MAX_WEEKLY_SHARE[mode]);
}

/**
 * Target weights reachable within the longest goal: at least 1 kg away, at most a year at
 * the fastest rate. Whole kilograms, matching the slider.
 */
export function getTargetWeightBounds(body: BodyStats, mode: WeightGoalMode) {
  const currentKg = Math.round(body.weightKg);

  if (mode === 'maintain') {
    return { min: currentKg, max: currentKg };
  }

  const reachKg = Math.max(1, Math.floor(getMaxWeeklyRateKg(body, mode) * MAX_GOAL_WEEKS));

  return mode === 'lose'
    ? { min: Math.max(TARGET_WEIGHT_LIMITS.min, currentKg - reachKg), max: currentKg - 1 }
    : { min: currentKg + 1, max: Math.min(TARGET_WEIGHT_LIMITS.max, currentKg + reachKg) };
}

/** How many weeks the change may take: between the fastest and the slowest sensible rate. */
export function getGoalDurationBounds(body: BodyStats, targetWeightKg: number): GoalDurationBounds {
  const mode = getPlanMode(body.weightKg, targetWeightKg);
  const changeKg = roundKg(Math.abs(targetWeightKg - body.weightKg));
  const maxWeeklyRateKg = getMaxWeeklyRateKg(body, mode);

  if (mode === 'maintain' || maxWeeklyRateKg <= 0) {
    return { mode, changeKg, maxWeeklyRateKg, minWeeks: 0, maxWeeks: 0 };
  }

  const minWeeklyRateKg = (MIN_MONTHLY_RATE_KG[mode] * DAYS_PER_WEEK) / DAYS_PER_MONTH;
  const minWeeks = Math.min(
    MAX_GOAL_WEEKS,
    Math.max(MIN_GOAL_WEEKS, Math.ceil(changeKg / maxWeeklyRateKg))
  );
  const maxWeeks = Math.max(
    minWeeks,
    Math.min(MAX_GOAL_WEEKS, Math.floor(changeKg / minWeeklyRateKg))
  );

  return { mode, changeKg, maxWeeklyRateKg, minWeeks, maxWeeks };
}

export function clampWeeks(bounds: GoalDurationBounds, weeks: number) {
  return Math.min(bounds.maxWeeks, Math.max(bounds.minWeeks, Math.round(weeks)));
}

/** A comfortable default: a bit over half the fastest rate. */
export function getDefaultWeeks(bounds: GoalDurationBounds) {
  if (bounds.maxWeeklyRateKg <= 0) {
    return bounds.minWeeks;
  }

  return clampWeeks(bounds, bounds.changeKg / (bounds.maxWeeklyRateKg * DEFAULT_PACE_SHARE));
}

/** Weeks a saved monthly rate takes for the remaining change, e.g. to prefill the slider. */
export function getWeeksForMonthlyRate(bounds: GoalDurationBounds, monthlyRateKg: number) {
  const weeklyRateKg = (Math.abs(monthlyRateKg) * DAYS_PER_WEEK) / DAYS_PER_MONTH;

  if (weeklyRateKg <= 0) {
    return getDefaultWeeks(bounds);
  }

  return clampWeeks(bounds, bounds.changeKg / weeklyRateKg);
}

export function getGoalPace(weeklyRateKg: number, maxWeeklyRateKg: number): GoalPace {
  const share = maxWeeklyRateKg > 0 ? weeklyRateKg / maxWeeklyRateKg : 0;

  if (share > 0.8) return 'fast';
  if (share > 0.45) return 'moderate';
  return 'gentle';
}

/** The daily plan for reaching the target weight in the given number of weeks. */
export function planForDuration(
  body: BodyStats,
  targetWeightKg: number,
  weeks: number
): GoalDurationPlan {
  const bounds = getGoalDurationBounds(body, targetWeightKg);
  const maintenanceCalories = calculateMaintenanceCalorieTarget(body);

  if (bounds.mode === 'maintain' || bounds.maxWeeks === 0) {
    return {
      mode: bounds.mode,
      weeks: 0,
      weeklyRateKg: 0,
      monthlyWeightGoalKg: 0,
      dailyCalories: maintenanceCalories,
      maintenanceCalories,
      pace: 'gentle',
    };
  }

  const clampedWeeks = clampWeeks(bounds, weeks);
  const weeklyRateKg = bounds.changeKg / clampedWeeks;
  const monthlyRateKg = Math.round(((weeklyRateKg * DAYS_PER_MONTH) / DAYS_PER_WEEK) * 100) / 100;
  const monthlyWeightGoalKg = bounds.mode === 'lose' ? monthlyRateKg : -monthlyRateKg;

  return {
    mode: bounds.mode,
    weeks: clampedWeeks,
    weeklyRateKg,
    monthlyWeightGoalKg,
    dailyCalories: calculateDailyCalorieTarget({
      ...body,
      displayName: '',
      monthlyWeightGoalKg,
      targetWeightKg,
    }),
    maintenanceCalories,
    pace: getGoalPace(weeklyRateKg, bounds.maxWeeklyRateKg),
  };
}

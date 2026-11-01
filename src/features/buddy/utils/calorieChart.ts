import type { NutritionTrendPoint } from '@/features/food-log/types';
import { addDays } from '@/features/goals/utils/weightGoal';

export type CalorieChartRange = 'week' | 'year';

/** Energy per gram; the stacks show where a bar's calories came from. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/** One bar: a day (week view) or a month's average per logged day (year view). */
export interface CalorieChartBar {
  /** YYYY-MM-DD for a day, YYYY-MM for a month. */
  key: string;
  /** Logged calories; the bar is exactly this tall. */
  kcal: number;
  carbsKcal: number;
  proteinKcal: number;
  fatKcal: number;
  /** Logged calories the macros do not account for (fibre, alcohol, rounding). */
  otherKcal: number;
  carbsGrams: number;
  proteinGrams: number;
  fatGrams: number;
  loggedDays: number;
  /** Not reached yet: drawn empty and not selectable. */
  future: boolean;
}

export interface CalorieChartData {
  bars: CalorieChartBar[];
  /** Average calorie target over the logged days, else the latest one; 0 when unknown. */
  target: number;
}

/** Monday of the week holding a YYYY-MM-DD day. */
export function getChartWeekStart(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return addDays(dateKey, -weekday);
}

/** First and last day the chart reads for a week (its Monday) or a year (any day in it). */
export function getChartDateRange(range: CalorieChartRange, anchor: string) {
  if (range === 'week') {
    return { start: anchor, end: addDays(anchor, 6) };
  }
  const year = anchor.slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function isLogged(point: NutritionTrendPoint) {
  return point.consumedCalories > 0;
}

/**
 * Splits logged calories into macro stacks. When the macros add up to more than was logged the
 * stacks shrink to fit; when less, the rest is "other", so the bar always matches the log.
 */
function splitCalories(kcal: number, proteinGrams: number, carbsGrams: number, fatGrams: number) {
  const protein = proteinGrams * KCAL_PER_GRAM.protein;
  const carbs = carbsGrams * KCAL_PER_GRAM.carbs;
  const fat = fatGrams * KCAL_PER_GRAM.fat;
  const fromMacros = protein + carbs + fat;
  const scale = fromMacros > kcal ? kcal / fromMacros : 1;

  return {
    proteinKcal: protein * scale,
    carbsKcal: carbs * scale,
    fatKcal: fat * scale,
    otherKcal: Math.max(0, kcal - fromMacros),
  };
}

function averageBar(key: string, points: NutritionTrendPoint[], future: boolean): CalorieChartBar {
  const logged = points.filter(isLogged);
  const count = Math.max(logged.length, 1);
  const average = (pick: (point: NutritionTrendPoint) => number) =>
    logged.reduce((sum, point) => sum + pick(point), 0) / count;

  const kcal = average((point) => point.consumedCalories);
  const proteinGrams = average((point) => point.proteinGrams);
  const carbsGrams = average((point) => point.carbsGrams);
  const fatGrams = average((point) => point.fatGrams);

  return {
    key,
    kcal,
    ...splitCalories(kcal, proteinGrams, carbsGrams, fatGrams),
    proteinGrams,
    carbsGrams,
    fatGrams,
    loggedDays: logged.length,
    future,
  };
}

function getTarget(points: NutritionTrendPoint[], today: string) {
  const logged = points.filter((point) => isLogged(point) && point.calorieTarget > 0);
  if (logged.length > 0) {
    return logged.reduce((sum, point) => sum + point.calorieTarget, 0) / logged.length;
  }
  return points.filter((point) => point.date <= today).at(-1)?.calorieTarget ?? 0;
}

/**
 * Bars for the chart from daily summaries covering {@link getChartDateRange}: one per day for a
 * week, and one per month for a year, averaged over the days that have a log.
 */
export function buildCalorieChart(
  range: CalorieChartRange,
  points: NutritionTrendPoint[],
  today: string
): CalorieChartData {
  const target = getTarget(points, today);

  if (range === 'week') {
    return {
      bars: points.map((point) => averageBar(point.date, [point], point.date > today)),
      target,
    };
  }

  const year = points[0]?.date.slice(0, 4) ?? today.slice(0, 4);
  const bars = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`;
    const ofMonth = points.filter((point) => point.date.startsWith(key));
    return averageBar(key, ofMonth, key > today.slice(0, 7));
  });

  return { bars, target };
}

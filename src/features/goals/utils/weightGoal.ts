import { formatDateKey } from '@/utils/date';
import type { WeightGoal, WeightLog } from '../types';

const DAYS_PER_MONTH = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Weigh-ins averaged into the current weight, to smooth out daily water swings. */
export const WEIGHT_TREND_DAYS = 7;
export const MAINTAIN_GOAL_DAYS = 30;

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${formatDateKey(dateKey)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function daysBetween(fromDateKey: string, toDateKey: string) {
  const from = new Date(`${formatDateKey(fromDateKey)}T00:00:00`);
  const to = new Date(`${formatDateKey(toDateKey)}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function roundKg(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Average of the weigh-ins in the week ending at the latest one, ignoring weigh-ins
 * before `sinceDate`. Null when there are none.
 */
export function calculateTrendWeight(logs: WeightLog[], sinceDate?: string): number | null {
  const since = sinceDate ? formatDateKey(sinceDate) : null;
  const relevant = since ? logs.filter((log) => log.date >= since) : logs;

  if (relevant.length === 0) {
    return null;
  }

  const latestDate = relevant.reduce(
    (latest, log) => (log.date > latest ? log.date : latest),
    relevant[0].date
  );
  const windowStart = addDays(latestDate, -(WEIGHT_TREND_DAYS - 1));
  const window = relevant.filter((log) => log.date >= windowStart);
  const total = window.reduce((sum, log) => sum + log.weightKg, 0);

  return roundKg(total / window.length);
}

/** Planned finish date: the weight change at the monthly rate, or a month to maintain. */
export function estimateGoalEndDate(
  startDate: string,
  startWeightKg: number,
  targetWeightKg: number,
  monthlyRateKg: number
) {
  const rate = Math.abs(monthlyRateKg);
  const changeKg = Math.abs(startWeightKg - targetWeightKg);

  if (rate <= 0 || changeKg <= 0) {
    return addDays(startDate, MAINTAIN_GOAL_DAYS);
  }

  return addDays(startDate, Math.ceil((changeKg / rate) * DAYS_PER_MONTH));
}

/** YYYY-MM-DD the goal should finish by its plan. */
export function getGoalEndDate(goal: WeightGoal) {
  const startDate = formatDateKey(goal.startedAt);
  const startKg = goal.startWeightKg ?? 0;

  // A plan edited mid-way stores its length; older goals derive it from the rate.
  return goal.mode !== 'maintain' && goal.targetDays > 0
    ? addDays(startDate, goal.targetDays)
    : estimateGoalEndDate(
        startDate,
        startKg,
        goal.targetWeightKg ?? startKg,
        goal.monthlyRateKg ?? 0
      );
}

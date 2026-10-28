import { formatDateKey } from '@/utils/date';
import type { WeightGoal, WeightGoalProgress, WeightLog } from '../types';

const DAYS_PER_MONTH = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Weigh-ins averaged into the current weight, to smooth out daily water swings. */
export const WEIGHT_TREND_DAYS = 7;
export const MAINTAIN_GOAL_DAYS = 30;
/** How far the weight may drift from the start of a maintain goal. */
export const MAINTAIN_BAND_KG = 1;

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

/** Progress of a weight goal (one with a start weight) from the weigh-ins since it began. */
export function calculateWeightGoalProgress(
  goal: WeightGoal,
  logs: WeightLog[],
  todayKey: string
): WeightGoalProgress {
  const startDate = formatDateKey(goal.startedAt);
  const startKg = goal.startWeightKg ?? 0;
  const targetKg = goal.targetWeightKg ?? startKg;
  const currentKg = calculateTrendWeight(logs, startDate) ?? startKg;
  const expectedEndDate = estimateGoalEndDate(
    startDate,
    startKg,
    targetKg,
    goal.monthlyRateKg ?? 0
  );
  const base = { goal, consumedCalories: 0, targetCalories: 0 };

  if (goal.mode === 'maintain') {
    const elapsedDays = Math.min(
      MAINTAIN_GOAL_DAYS,
      Math.max(1, daysBetween(startDate, todayKey) + 1)
    );
    const withinBand = Math.abs(currentKg - startKg) <= MAINTAIN_BAND_KG;
    const lastWeighIn = logs.reduce<string | null>(
      (latest, log) =>
        log.date >= startDate && (!latest || log.date > latest) ? log.date : latest,
      null
    );
    // A weigh-in in the final week proves the weight held, not just the start value.
    const weighedInFinalWeek =
      lastWeighIn !== null &&
      lastWeighIn >= addDays(startDate, MAINTAIN_GOAL_DAYS - WEIGHT_TREND_DAYS);

    return {
      ...base,
      progressValue: elapsedDays,
      targetValue: MAINTAIN_GOAL_DAYS,
      progressPercent: Math.round((elapsedDays / MAINTAIN_GOAL_DAYS) * 100),
      remainingValue: MAINTAIN_GOAL_DAYS - elapsedDays,
      unit: 'days',
      completed: elapsedDays >= MAINTAIN_GOAL_DAYS && withinBand && weighedInFinalWeek,
      weight: {
        startKg,
        targetKg: startKg,
        currentKg,
        changeKg: roundKg(currentKg - startKg),
        expectedEndDate,
        withinBand,
      },
    };
  }

  const direction = goal.mode === 'lose' ? 1 : -1;
  const totalKg = roundKg(Math.abs(startKg - targetKg));
  const changeKg = roundKg((startKg - currentKg) * direction);
  const progressValue = roundKg(Math.min(totalKg, Math.max(0, changeKg)));

  return {
    ...base,
    progressValue,
    targetValue: totalKg,
    progressPercent: totalKg > 0 ? Math.round((progressValue / totalKg) * 100) : 0,
    remainingValue: roundKg(Math.max(0, totalKg - progressValue)),
    unit: 'kg',
    completed: totalKg > 0 && changeKg >= totalKg,
    weight: {
      startKg,
      targetKg,
      currentKg,
      changeKg,
      expectedEndDate,
      withinBand: true,
    },
  };
}

import { addDays } from '@/features/goals/utils/weightGoal';
import { formatDateKey } from '@/utils/date';
import { MET_SCORE } from '../constants/stats';
import type { BuddyAxis, BuddyDayScore } from '../types';

export type StatsRange = 'week' | 'month' | 'all';

const RANGE_DAYS = { week: 7, month: 30 } as const;
const DAYS_PER_WEEK = 7;

export interface AxisChartPoint {
  /** First day the point covers (YYYY-MM-DD). */
  date: string;
  score: number | null;
  isToday: boolean;
}

/** The numbers behind a stat; each stat fills the ones its line shows. */
export type AxisAverages = Partial<
  Record<
    'value' | 'target' | 'late' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sodium' | 'sugar',
    number | null
  >
>;

export interface AxisSummary {
  average: number | null;
  metDays: number;
  scoredDays: number;
  best: BuddyDayScore | null;
}

/** Days in the range, ending today; `all` keeps every day since the first log. */
export function getRangeDays(days: BuddyDayScore[], range: StatsRange, today = new Date()) {
  if (range === 'all') {
    return days;
  }

  const startDate = addDays(formatDateKey(today), -(RANGE_DAYS[range] - 1));
  return days.filter((day) => day.date >= startDate);
}

function mean(values: number[]) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoresOf(days: BuddyDayScore[], axis: BuddyAxis) {
  return days.map((day) => day.scores[axis]).filter((score): score is number => score !== null);
}

/** Average score, days that met the goal and the best day, over finished days only. */
export function summarizeAxis(days: BuddyDayScore[], axis: BuddyAxis): AxisSummary {
  const finished = days.filter((day) => !day.isToday);
  const scores = scoresOf(finished, axis);
  const average = mean(scores);
  let best: BuddyDayScore | null = null;

  for (const day of finished) {
    const score = day.scores[axis];

    if (score !== null && (best === null || score >= (best.scores[axis] ?? 0))) {
      best = day;
    }
  }

  return {
    average: average === null ? null : Math.round(average),
    metDays: scores.filter((score) => score >= MET_SCORE).length,
    scoredDays: scores.length,
    best,
  };
}

/** One bar per day for a week or a month; one per week (average) since the first log. */
export function getAxisChartPoints(
  days: BuddyDayScore[],
  axis: BuddyAxis,
  range: StatsRange
): AxisChartPoint[] {
  if (range !== 'all') {
    return days.map((day) => ({ date: day.date, score: day.scores[axis], isToday: day.isToday }));
  }

  const points: AxisChartPoint[] = [];

  for (let index = 0; index < days.length; index += DAYS_PER_WEEK) {
    const week = days.slice(index, index + DAYS_PER_WEEK);
    const average = mean(
      scoresOf(
        week.filter((day) => !day.isToday),
        axis
      )
    );

    points.push({
      date: week[0].date,
      score: average === null ? null : Math.round(average),
      isToday: week.every((day) => day.isToday),
    });
  }

  return points;
}

function roundOrNull(value: number | null, digits = 0) {
  if (value === null) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * The numbers behind a stat over finished days, for the line under the score: calories
 * against the target, main meals a day, share of meals on time, and so on.
 */
export function getAxisAverages(days: BuddyDayScore[], axis: BuddyAxis): AxisAverages {
  const finished = days.filter((day) => !day.isToday);
  const logged = finished.filter((day) => day.logged);
  const average = (read: (day: BuddyDayScore) => number | null, from = logged) =>
    mean(from.map(read).filter((value): value is number => value !== null));
  const percentOfTarget = (value: number, target: number) =>
    target > 0 ? (100 * value) / target : null;

  switch (axis) {
    case 'calories':
      return {
        value: roundOrNull(average((day) => day.summary.consumedCalories)),
        target: roundOrNull(average((day) => day.summary.calorieTarget)),
      };
    case 'nutrients':
      return {
        protein: roundOrNull(
          average((day) =>
            percentOfTarget(day.summary.proteinGrams, day.summary.proteinTargetGrams)
          )
        ),
        carbs: roundOrNull(
          average((day) => percentOfTarget(day.summary.carbsGrams, day.summary.carbsTargetGrams))
        ),
        fat: roundOrNull(
          average((day) => percentOfTarget(day.summary.fatGrams, day.summary.fatTargetGrams))
        ),
      };
    case 'quality': {
      const judged = logged.filter((day) => day.scores.quality !== null);

      return {
        fiber: roundOrNull(average((day) => day.summary.nutrients.fiberGrams, judged)),
        sodium: roundOrNull(average((day) => day.summary.nutrients.sodiumMg, judged)),
        sugar: roundOrNull(average((day) => day.summary.nutrients.sugarGrams, judged)),
      };
    }
    case 'timing': {
      const main = logged.reduce((sum, day) => sum + day.meals.main, 0);
      const onTime = logged.reduce((sum, day) => sum + day.meals.onTime, 0);

      return {
        value: main === 0 ? null : Math.round((100 * onTime) / main),
        late: logged.filter((day) => day.meals.lateNight).length,
      };
    }
    case 'meals':
      return {
        value: roundOrNull(
          average((day) => day.meals.main),
          1
        ),
      };
    case 'consistency':
      return { value: logged.length, target: finished.length };
  }
}

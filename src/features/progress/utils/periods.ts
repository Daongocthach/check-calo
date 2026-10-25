import type { FoodEntry, NutritionTrendPoint } from '@/features/food-log/types';
import { MEAL_SLOTS, getMealSlot, type MealSlot } from '@/features/food-log/utils/mealSlot';
import { formatDateKey } from '@/utils/date';

export type ProgressPeriod = 'day' | 'week' | 'month' | 'year';

export interface ChartBar {
  key: string;
  label: string;
  value: number;
  /** Reference line value for this bar (daily target), 0 when not applicable. */
  target: number;
  isCurrent: boolean;
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(period: ProgressPeriod, today: Date): PeriodRange {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === 'month') {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1, 0);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    end.setTime(start.getTime());
    end.setMonth(11, 31);
  }

  return { start, end };
}

export function buildDailyBars(
  summaries: NutritionTrendPoint[],
  today: Date,
  locale: string,
  labelMode: 'weekday' | 'dayOfMonth'
): ChartBar[] {
  const todayKey = formatDateKey(today);

  return summaries.map((summary) => {
    const date = new Date(`${summary.date}T00:00:00`);

    return {
      key: summary.date,
      label:
        labelMode === 'weekday'
          ? date.toLocaleDateString(locale, { weekday: 'short' })
          : String(date.getDate()),
      value: Math.round(summary.consumedCalories),
      target: summary.calorieTarget,
      isCurrent: summary.date === todayKey,
    };
  });
}

/** One bar per month: average kcal over logged days. */
export function buildMonthlyBars(
  summaries: NutritionTrendPoint[],
  today: Date,
  locale: string
): ChartBar[] {
  return Array.from({ length: 12 }, (_, month) => {
    const monthSummaries = summaries.filter(
      (summary) => new Date(`${summary.date}T00:00:00`).getMonth() === month
    );
    const logged = monthSummaries.filter((summary) => summary.consumedCalories > 0);
    const total = logged.reduce((sum, summary) => sum + summary.consumedCalories, 0);
    const averageTarget =
      logged.length > 0
        ? logged.reduce((sum, summary) => sum + summary.calorieTarget, 0) / logged.length
        : 0;

    return {
      key: `m${month}`,
      label: new Date(today.getFullYear(), month, 1).toLocaleDateString(locale, {
        month: 'narrow',
      }),
      value: logged.length > 0 ? Math.round(total / logged.length) : 0,
      target: Math.round(averageTarget),
      isCurrent: month === today.getMonth(),
    };
  });
}

/** Day view: one bar per meal slot. */
export function buildSlotBars(entries: FoodEntry[], labels: Record<MealSlot, string>): ChartBar[] {
  return MEAL_SLOTS.map((slot) => ({
    key: slot,
    label: labels[slot],
    value: Math.round(
      entries
        .filter((entry) => getMealSlot(entry.consumedAt) === slot)
        .reduce((sum, entry) => sum + entry.totalCalories, 0)
    ),
    target: 0,
    isCurrent: slot === getMealSlot(new Date()),
  }));
}

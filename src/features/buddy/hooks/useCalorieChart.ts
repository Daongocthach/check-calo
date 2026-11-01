import { useCallback, useMemo } from 'react';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import {
  buildCalorieChart,
  getChartDateRange,
  type CalorieChartRange,
} from '../utils/calorieChart';

/** Calorie bars for a week (anchor: its Monday) or a year (anchor: any day in it). */
export function useCalorieChart(range: CalorieChartRange, anchor: string, today: string) {
  const { start, end } = getChartDateRange(range, anchor);
  const loader = useCallback(() => listDailyNutritionSummaries(start, end), [end, start]);
  const { data } = useFoodLogQuery(`calorie-chart:${start}:${end}`, loader);

  // The query keeps the previous period's rows while the next loads. Another week (or year) can
  // stand in meanwhile, but a year of days must not be drawn as a week.
  const matches = !!data && (range === 'week' ? data.length === 7 : data.length > 7);

  return useMemo(
    () => (data && matches ? buildCalorieChart(range, data, today) : null),
    [data, matches, range, today]
  );
}

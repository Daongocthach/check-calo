import { useCallback } from 'react';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import {
  listTopFoods,
  type TopFoodMeasure,
} from '@/features/food-log/services/dailySummaryService';
import { getBuddyStats } from '../services/buddyStatsService';

export function useBuddyStats() {
  return useFoodLogQuery('buddy-stats', getBuddyStats);
}

/** Foods that added the most of `measure` between two dates; nothing without a measure. */
export function useTopFoods(measure: TopFoodMeasure | null, startDate: string, endDate: string) {
  const loader = useCallback(
    () => (measure ? listTopFoods(startDate, endDate, measure) : Promise.resolve([])),
    [endDate, measure, startDate]
  );

  return useFoodLogQuery(`top-foods:${measure ?? 'none'}:${startDate}:${endDate}`, loader);
}

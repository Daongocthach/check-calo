import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import { useCurrentDate } from '@/hooks';
import { formatDateKey } from '@/utils/date';
import { syncGoalTracking } from '../services/goalTrackingService';

/** The active weight goal, its history and today's summary, shared by Profile and Goal history. */
export function useGoalTracking() {
  const today = useCurrentDate();
  const query = useFoodLogQuery(`goal-tracking:${formatDateKey(today)}`, async () => {
    const [snapshot, todaySummaries] = await Promise.all([
      syncGoalTracking(),
      listDailyNutritionSummaries(today, today),
    ]);
    return { snapshot, todaySummary: todaySummaries[0] ?? null };
  });

  return {
    snapshot: query.data?.snapshot ?? null,
    todaySummary: query.data?.todaySummary ?? null,
    isLoading: query.isLoading,
  };
}

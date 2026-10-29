import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import { useCurrentDate } from '@/hooks';
import { formatDateKey } from '@/utils/date';
import { refreshGoalTracking } from '../services/goalLifecycle';

/** The active weight goal, its history and today's summary, shared by Profile and Goal history. */
export function useGoalTracking() {
  const today = useCurrentDate();
  const query = useFoodLogQuery(`goal-tracking:${formatDateKey(today)}`, async () => {
    // Goals first: ending a transition or reaching a target changes today's plan.
    const snapshot = await refreshGoalTracking();
    const [todaySummary] = await listDailyNutritionSummaries(today, today);
    return { snapshot, todaySummary: todaySummary ?? null };
  });

  return {
    snapshot: query.data?.snapshot ?? null,
    todaySummary: query.data?.todaySummary ?? null,
    isLoading: query.isLoading,
  };
}

import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useCurrentDate } from '@/hooks';
import { formatDateKey } from '@/utils/date';
import { refreshGoalTracking } from '../services/goalLifecycle';

/**
 * The active goal and its history, shared by the dashboard and Goal history. Loading it also
 * completes reached goals and unlocks achievements.
 */
export function useGoalTracking() {
  const today = useCurrentDate();
  const query = useFoodLogQuery(`goal-tracking:${formatDateKey(today)}`, refreshGoalTracking);

  return {
    snapshot: query.data,
    isLoading: query.isLoading,
  };
}

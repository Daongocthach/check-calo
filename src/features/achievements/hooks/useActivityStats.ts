import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { getActivityStats } from '../services/activityStatsService';

export function useActivityStats() {
  return useFoodLogQuery('activity-stats', getActivityStats);
}

import { useActivityStats } from '@/features/achievements/hooks/useActivityStats';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { getBuddyPoints } from '../services/buddyPointsService';
import { calculateBuddyProgress } from '../utils/buddyProgress';

export function useBuddyProgress() {
  const { data: stats, isLoading: statsLoading } = useActivityStats();
  const { data: points, isLoading: pointsLoading } = useFoodLogQuery(
    'buddy-points',
    getBuddyPoints
  );

  return {
    stats,
    progress: points === null ? null : calculateBuddyProgress(points),
    isLoading: statsLoading || pointsLoading,
  };
}

import { useActivityStats } from '@/features/achievements/hooks/useActivityStats';
import { calculateBuddyProgress } from '../utils/buddyProgress';

export function useBuddyProgress() {
  const { data: stats, isLoading } = useActivityStats();

  return {
    stats,
    progress: stats ? calculateBuddyProgress(stats) : null,
    isLoading,
  };
}

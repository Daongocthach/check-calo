import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FOOD_LOG_QUERY_SCOPE, useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useAuthStore } from '@/providers/auth/authStore';
import { formatDateKey } from '@/utils/date';
import { QUEST_CONFIG_STALE_MS } from '../constants/quests';
import { evaluateQuests } from '../quests/questEngine';
import { getBuddyPoints } from '../services/buddyPointsService';
import { getBuddyStats } from '../services/buddyStatsService';
import { fetchBuddyQuests, getCachedQuests } from '../services/questConfigService';
import { getQuestState, type QuestState } from '../services/questStateService';
import type { BuddyStats } from '../types';
import { calculateBuddyProgress } from '../utils/buddyProgress';

/** The quest list from Supabase, starting from the saved (or built-in) one. */
export function useQuestConfig() {
  return useQuery({
    queryKey: ['buddy-quest-config'],
    queryFn: fetchBuddyQuests,
    initialData: getCachedQuests,
    // The saved list shows at once and is refreshed straight away.
    initialDataUpdatedAt: 0,
    staleTime: QUEST_CONFIG_STALE_MS,
  });
}

interface QuestSources {
  stats: BuddyStats | null | undefined;
  points: number | null | undefined;
  state: QuestState | null | undefined;
}

/** Quest statuses and completions due, once every source has loaded. */
function useQuestEvaluation({ stats, points, state }: QuestSources) {
  const { data: quests } = useQuestConfig();
  const user = useAuthStore((store) => store.user);
  const hasAccount = Boolean(user && !user.isAnonymous);

  return useMemo(() => {
    if (!stats || points === null || points === undefined || !state) {
      return null;
    }

    const now = new Date();

    return evaluateQuests({
      quests,
      days: stats.days,
      today: formatDateKey(now),
      now,
      goalMode: stats.days.at(-1)?.summary.goalMode ?? 'maintain',
      level: calculateBuddyProgress(points).current.level,
      completions: state.completions,
      completedGoals: state.completedGoals,
      hasAccount,
      switchedAt: state.switchedAt,
    });
  }, [hasAccount, points, quests, state, stats]);
}

/** Quest statuses for a screen; refreshed with the diary and on focus. */
export function useBuddyQuests() {
  const { data: stats } = useFoodLogQuery('buddy-stats', getBuddyStats);
  const { data: points } = useFoodLogQuery('buddy-points', getBuddyPoints);
  const { data: state } = useFoodLogQuery('buddy-quest-state', getQuestState);

  return useQuestEvaluation({ stats, points, state })?.statuses ?? null;
}

/**
 * The same data outside any screen (the root layout has no focus events), sharing the cached
 * results the screens use.
 */
export function useBackgroundQuestEvaluation() {
  const stats = useQuery({
    queryKey: [FOOD_LOG_QUERY_SCOPE, 'buddy-stats'],
    queryFn: getBuddyStats,
  });
  const points = useQuery({
    queryKey: [FOOD_LOG_QUERY_SCOPE, 'buddy-points'],
    queryFn: getBuddyPoints,
  });
  const state = useQuery({
    queryKey: [FOOD_LOG_QUERY_SCOPE, 'buddy-quest-state'],
    queryFn: getQuestState,
  });

  return useQuestEvaluation({ stats: stats.data, points: points.data, state: state.data });
}

import { useMemo, useState } from 'react';
import { useActivityStats } from '@/features/achievements/hooks/useActivityStats';
import { getDayStatus } from '@/features/achievements/services/activityStatsService';
import type { DayStatus } from '@/features/achievements/types';
import { useDevToolsStore } from '@/features/dev-tools';
import { useDayFoodLog } from '@/features/food-log/hooks/useDayFoodLog';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { useCurrentDate } from '@/hooks';
import { formatDateKey } from '@/utils/date';
import { getWeekDays } from '../utils/week';

export function useHomeScreen() {
  const today = useCurrentDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekStartKey = formatDateKey(weekDays[0]);
  const weekEndKey = formatDateKey(weekDays[6]);

  const day = useDayFoodLog(selectedDate);
  const forceEmptyDiary = useDevToolsStore(
    (state) => __DEV__ && state.enabled && state.forceEmptyDiary
  );
  const profile = useFoodLogQuery('profile', getUserProfile);
  const stats = useActivityStats();
  const week = useFoodLogQuery(`week:${weekStartKey}`, () =>
    listDailyNutritionSummaries(weekStartKey, weekEndKey)
  );

  const dayStatuses = useMemo(() => {
    const statuses: Record<string, DayStatus> = {};
    for (const summary of forceEmptyDiary ? [] : (week.data ?? [])) {
      statuses[summary.date] = getDayStatus(summary, profile.data ?? null);
    }
    return statuses;
  }, [forceEmptyDiary, profile.data, week.data]);

  return {
    today,
    selectedDate,
    setSelectedDate,
    dayStatuses,
    profile: profile.data,
    isProfileMissing: !profile.isLoading && !profile.error && profile.data === null,
    summary: forceEmptyDiary ? null : (day.data?.summary ?? null),
    mealGroups: forceEmptyDiary ? [] : (day.data?.mealGroups ?? []),
    isLoading: day.isLoading && !day.data,
    streak: stats.data?.currentStreak ?? 0,
  };
}

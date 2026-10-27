import { useMemo, useState } from 'react';
import { useActivityStats } from '@/features/achievements/hooks/useActivityStats';
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
  const profile = useFoodLogQuery('profile', getUserProfile);
  const stats = useActivityStats();
  const week = useFoodLogQuery(`week:${weekStartKey}`, () =>
    listDailyNutritionSummaries(weekStartKey, weekEndKey)
  );

  const loggedDateKeys = useMemo(
    () =>
      new Set(
        (week.data ?? [])
          .filter((summary) => summary.consumedCalories > 0)
          .map((summary) => summary.date)
      ),
    [week.data]
  );

  return {
    today,
    selectedDate,
    setSelectedDate,
    loggedDateKeys,
    profile: profile.data,
    isProfileMissing: !profile.isLoading && !profile.error && profile.data === null,
    summary: day.data?.summary ?? null,
    mealGroups: day.data?.mealGroups ?? [],
    isLoading: day.isLoading && !day.data,
    streak: stats.data?.currentStreak ?? 0,
  };
}

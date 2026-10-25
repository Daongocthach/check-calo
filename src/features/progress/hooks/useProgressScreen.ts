import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import { listFoodEntriesByDate } from '@/features/food-log/services/foodEntryRepository';
import { syncGoalTracking } from '@/features/goals/services/goalTrackingService';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { useCurrentDate } from '@/hooks';
import { formatDateKey } from '@/utils/date';
import {
  buildDailyBars,
  buildMonthlyBars,
  buildSlotBars,
  getPeriodRange,
  type ProgressPeriod,
} from '../utils/periods';

export function useProgressScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const today = useCurrentDate();
  const [period, setPeriod] = useState<ProgressPeriod>('week');
  const range = getPeriodRange(period, today);
  const startKey = formatDateKey(range.start);
  const endKey = formatDateKey(range.end);
  const weekRange = getPeriodRange('week', today);

  const chart = useFoodLogQuery(`progress:${period}:${startKey}:${i18n.language}`, async () => {
    if (period === 'day') {
      const entries = await listFoodEntriesByDate(startKey);
      return buildSlotBars(entries, {
        breakfast: t('mealSlots.breakfast'),
        lunch: t('mealSlots.lunch'),
        dinner: t('mealSlots.dinner'),
        snack: t('mealSlots.snack'),
      });
    }

    const summaries = await listDailyNutritionSummaries(startKey, endKey);
    if (period === 'year') {
      return buildMonthlyBars(summaries, today, locale);
    }
    return buildDailyBars(summaries, today, locale, period === 'week' ? 'weekday' : 'dayOfMonth');
  });

  const challenge = useFoodLogQuery(`challenge:${formatDateKey(weekRange.start)}`, async () => {
    const [profile, summaries] = await Promise.all([
      getUserProfile(),
      listDailyNutritionSummaries(weekRange.start, weekRange.end),
    ]);

    return summaries.map((summary) => ({
      date: summary.date,
      label: new Date(`${summary.date}T00:00:00`).toLocaleDateString(locale, { weekday: 'short' }),
      done:
        summary.consumedCalories > 0 &&
        getDailyCalorieGoalState(profile, summary.calorieTarget, summary.consumedCalories) ===
          'on_target',
      isFuture: summary.date > formatDateKey(today),
    }));
  });

  const goals = useFoodLogQuery('goal-tracking', async () => {
    const [snapshot, todaySummaries] = await Promise.all([
      syncGoalTracking(),
      listDailyNutritionSummaries(today, today),
    ]);
    return { snapshot, todaySummary: todaySummaries[0] };
  });

  const bars = chart.data ?? [];
  const loggedBars = bars.filter((bar) => bar.value > 0);
  const total =
    period === 'year'
      ? Math.round(
          loggedBars.reduce((sum, bar) => sum + bar.value, 0) / Math.max(1, loggedBars.length)
        )
      : bars.reduce((sum, bar) => sum + bar.value, 0);
  const rangeLabel =
    period === 'day'
      ? range.start.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      : `${range.start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${range.end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return {
    period,
    setPeriod,
    bars,
    total,
    totalIsAverage: period === 'year',
    rangeLabel,
    challenge: challenge.data ?? [],
    goalSnapshot: goals.data?.snapshot ?? null,
    todaySummary: goals.data?.todaySummary ?? null,
  };
}

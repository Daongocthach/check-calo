import {
  getFirstEntryDate,
  listDailyNutritionSummaries,
  listEntryTimes,
  listNutrientCoverage,
} from '@/features/food-log/services/dailySummaryService';
import { getStoredCalorieReminders } from '@/features/notifications/services/calorieReminderService';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { formatDateKey } from '@/utils/date';
import type { BuddyStats } from '../types';
import { scoreDay } from '../utils/dayScore';
import { getOnTimeWindows, summarizeMealsByDate } from '../utils/mealTiming';
import { aggregateBuddyStats } from '../utils/statsAggregate';

const NO_MEALS = { main: 0, onTime: 0, lateNight: false };

/** Scores every day since the first log and averages them into Buddy's stats. */
export async function getBuddyStats(): Promise<BuddyStats> {
  const firstEntryDate = await getFirstEntryDate();
  const today = formatDateKey(new Date());

  if (!firstEntryDate) {
    return aggregateBuddyStats([]);
  }

  const [profile, summaries, entryTimes, coverage] = await Promise.all([
    getUserProfile(),
    listDailyNutritionSummaries(firstEntryDate, today),
    listEntryTimes(firstEntryDate, today),
    listNutrientCoverage(firstEntryDate, today),
  ]);
  const mealsByDate = summarizeMealsByDate(
    entryTimes,
    getOnTimeWindows(getStoredCalorieReminders())
  );

  return aggregateBuddyStats(
    summaries.map((summary) => {
      const meals = mealsByDate.get(summary.date) ?? NO_MEALS;
      const nutrientCoverage = coverage.get(summary.date) ?? 0;

      return {
        date: summary.date,
        isToday: summary.date === today,
        logged: summary.consumedCalories > 0,
        summary,
        meals,
        nutrientCoverage,
        scores: scoreDay({ summary, meals, nutrientCoverage }, profile),
      };
    })
  );
}

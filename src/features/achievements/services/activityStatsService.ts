import {
  countFoodEntries,
  getFirstEntryDate,
  listDailyNutritionSummaries,
} from '@/features/food-log/services/dailySummaryService';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import type { UserProfile } from '@/features/profile/types';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { formatDateKey } from '@/utils/date';
import { ACHIEVEMENTS } from '../constants/achievements';
import type { AchievementProgress, ActivityStats, DayStatus } from '../types';

const PROTEIN_DAY_RATIO = 0.8;
const BALANCED_DAY_RATIO = 0.7;

function reachesRatio(value: number, target: number, ratio: number) {
  return target > 0 && value >= target * ratio;
}

function getDayStatus(summary: NutritionTrendPoint, profile: UserProfile | null): DayStatus {
  if (summary.consumedCalories <= 0) {
    return 'empty';
  }

  return getDailyCalorieGoalState(profile, summary.calorieTarget, summary.consumedCalories) ===
    'on_target'
    ? 'on_target'
    : 'off_target';
}

function countStreaks(summaries: NutritionTrendPoint[]) {
  let longestStreak = 0;
  let running = 0;

  for (const summary of summaries) {
    running = summary.consumedCalories > 0 ? running + 1 : 0;
    longestStreak = Math.max(longestStreak, running);
  }

  let currentStreak = 0;
  const lastIndex = summaries.length - 1;
  // Today does not break the streak until the day is over.
  const startIndex =
    lastIndex >= 0 && summaries[lastIndex].consumedCalories <= 0 ? lastIndex - 1 : lastIndex;

  for (let index = startIndex; index >= 0; index -= 1) {
    if (summaries[index].consumedCalories <= 0) {
      break;
    }
    currentStreak += 1;
  }

  return { currentStreak, longestStreak };
}

const EMPTY_STATS: ActivityStats = {
  loggedDays: 0,
  onTargetDays: 0,
  proteinDays: 0,
  balancedDays: 0,
  totalEntries: 0,
  currentStreak: 0,
  longestStreak: 0,
  dayStatuses: {},
};

/** Aggregates the whole diary into the numbers used by streaks, achievements and Buddy. */
export async function getActivityStats(): Promise<ActivityStats> {
  const firstEntryDate = await getFirstEntryDate();

  if (!firstEntryDate) {
    return EMPTY_STATS;
  }

  const [profile, summaries, totalEntries] = await Promise.all([
    getUserProfile(),
    listDailyNutritionSummaries(firstEntryDate, formatDateKey(new Date())),
    countFoodEntries(),
  ]);

  const dayStatuses: Record<string, DayStatus> = {};
  let loggedDays = 0;
  let onTargetDays = 0;
  let proteinDays = 0;
  let balancedDays = 0;

  for (const summary of summaries) {
    const status = getDayStatus(summary, profile);
    dayStatuses[summary.date] = status;

    if (status === 'empty') {
      continue;
    }

    loggedDays += 1;
    onTargetDays += status === 'on_target' ? 1 : 0;

    if (
      profile &&
      reachesRatio(summary.proteinGrams, profile.proteinTargetGrams, PROTEIN_DAY_RATIO)
    ) {
      proteinDays += 1;
    }

    if (
      profile &&
      reachesRatio(summary.proteinGrams, profile.proteinTargetGrams, BALANCED_DAY_RATIO) &&
      reachesRatio(summary.carbsGrams, profile.carbsTargetGrams, BALANCED_DAY_RATIO) &&
      reachesRatio(summary.fatGrams, profile.fatTargetGrams, BALANCED_DAY_RATIO)
    ) {
      balancedDays += 1;
    }
  }

  return {
    loggedDays,
    onTargetDays,
    proteinDays,
    balancedDays,
    totalEntries,
    ...countStreaks(summaries),
    dayStatuses,
  };
}

export function getAchievementProgress(stats: ActivityStats): AchievementProgress[] {
  return ACHIEVEMENTS.map((definition) => {
    const value = Math.min(definition.metric(stats), definition.target);

    return { definition, value, unlocked: value >= definition.target };
  });
}

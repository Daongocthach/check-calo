import type { NutritionTrendPoint } from '@/features/food-log/types';
import type { UserProfile, UserProfileInput } from '@/features/profile/types';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { formatDateKey } from '@/utils/date';
import type { WeightGoal, WeightGoalMode, WeightGoalProgress } from '../types';
import { addDays, daysBetween, getGoalEndDate } from './weightGoal';

const KCAL_PER_KG = 7700;
/** The window a maintain goal shows its recent days over. */
export const MAINTAIN_RECENT_DAYS = 7;
/** On-target days a maintain goal is congratulated at. */
export const MAINTAIN_MILESTONE_DAYS = [7, 30, 90, 180, 365] as const;

type GoalProgressProfile = UserProfileInput & Pick<UserProfile, 'maintenanceCalorieTarget'>;

/** A logged day whose intake sits in the calorie range of the goal it was logged under. */
function isOnTargetDay(summary: NutritionTrendPoint, profile: UserProfileInput) {
  return (
    summary.consumedCalories > 0 &&
    getDailyCalorieGoalState(
      profile,
      summary.calorieTarget,
      summary.consumedCalories,
      summary.date,
      summary.goalMode
    ) === 'on_target'
  );
}

/** The highest milestone `onTargetDays` has reached, or null before the first. */
export function getReachedMaintainMilestone(onTargetDays: number): number | null {
  return MAINTAIN_MILESTONE_DAYS.filter((days) => onTargetDays >= days).at(-1) ?? null;
}

/**
 * Calories cut below maintenance (lose) or eaten above it (gain), summed over logged days.
 * A day on the wrong side counts as zero rather than taking progress back.
 */
export function sumGoalCalorieDelta(
  mode: Exclude<WeightGoalMode, 'maintain'>,
  summaries: NutritionTrendPoint[],
  maintenanceCalories: number
): number {
  return Math.round(
    summaries.reduce((total, summary) => {
      if (summary.consumedCalories <= 0) {
        return total;
      }

      if (mode === 'lose') {
        return total + Math.max(0, maintenanceCalories - summary.consumedCalories);
      }

      return total + Math.max(0, summary.consumedCalories - maintenanceCalories);
    }, 0)
  );
}

/**
 * A maintain goal has no end: it counts the on-target days since it started, out of the days
 * it has run, and the same over the last week.
 */
function calculateMaintainProgress(
  goal: WeightGoal,
  summaries: NutritionTrendPoint[],
  profile: UserProfileInput,
  endDateKey: string
): WeightGoalProgress {
  const startDateKey = formatDateKey(goal.startedAt);
  const weekStartKey = addDays(endDateKey, -(MAINTAIN_RECENT_DAYS - 1));
  const recentStartKey = weekStartKey > startDateKey ? weekStartKey : startDateKey;
  const onTargetDates = summaries
    .filter((summary) => summary.date >= startDateKey && summary.date <= endDateKey)
    .filter((summary) => isOnTargetDay(summary, profile))
    .map((summary) => summary.date);
  const trackedDays = Math.max(1, daysBetween(startDateKey, endDateKey) + 1);
  const onTargetDays = onTargetDates.length;

  return {
    goal,
    progressValue: onTargetDays,
    targetValue: trackedDays,
    progressPercent: Math.min(100, Math.round((onTargetDays / trackedDays) * 100)),
    remainingValue: 0,
    unit: 'days',
    completed: false,
    expectedEndDate: null,
    recent: {
      onTargetDays: onTargetDates.filter((date) => date >= recentStartKey).length,
      days: Math.max(1, daysBetween(recentStartKey, endDateKey) + 1),
    },
  };
}

/**
 * Progress of a goal by the diary up to `endDateKey`: the calorie deficit (or surplus) logged
 * since it started, against the calories its weight change takes. Reaching that completes it;
 * maintain goals never complete and count their on-target days instead.
 */
export function calculateGoalProgress(
  goal: WeightGoal,
  summaries: NutritionTrendPoint[],
  profile: GoalProgressProfile,
  endDateKey: string
): WeightGoalProgress {
  if (goal.mode === 'maintain') {
    return calculateMaintainProgress(goal, summaries, profile, endDateKey);
  }

  const targetValue = Math.max(
    1,
    goal.targetKcalDelta > 0 ? goal.targetKcalDelta : Math.round((goal.targetKg ?? 0) * KCAL_PER_KG)
  );
  const progressValue = sumGoalCalorieDelta(goal.mode, summaries, profile.maintenanceCalorieTarget);

  return {
    goal,
    progressValue,
    targetValue,
    progressPercent: Math.min(100, Math.round((progressValue / targetValue) * 100)),
    remainingValue: Math.max(0, targetValue - progressValue),
    unit: 'kcal',
    completed: progressValue >= targetValue,
    expectedEndDate: getGoalEndDate(goal),
    recent: null,
  };
}

export function getStreakFromSummaries(
  summaries: NutritionTrendPoint[],
  profile: UserProfile
): number {
  const todayKey = formatDateKey(new Date());
  const summaryMap = new Map(summaries.map((summary) => [summary.date, summary]));
  const cursor = new Date(`${todayKey}T00:00:00`);
  let streak = 0;

  while (true) {
    const dateKey = formatDateKey(cursor);
    const summary = summaryMap.get(dateKey);

    if (!summary || !isOnTargetDay(summary, profile)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

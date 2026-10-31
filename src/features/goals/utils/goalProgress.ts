import type { NutritionTrendPoint } from '@/features/food-log/types';
import type { UserProfile } from '@/features/profile/types';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { formatDateKey } from '@/utils/date';
import type { WeightGoal, WeightGoalMode, WeightGoalProgress } from '../types';
import { daysBetween, getGoalEndDate, MAINTAIN_GOAL_DAYS } from './weightGoal';

const KCAL_PER_KG = 7700;

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
 * Progress of a goal by the diary up to `endDateKey`: the calorie deficit (or surplus) logged
 * since it started, against the calories its weight change takes. Reaching that completes it;
 * maintain goals complete once their days have passed.
 */
export function calculateGoalProgress(
  goal: WeightGoal,
  summaries: NutritionTrendPoint[],
  maintenanceCalories: number,
  endDateKey: string
): WeightGoalProgress {
  const expectedEndDate = getGoalEndDate(goal);
  let unit: WeightGoalProgress['unit'] = 'kcal';
  let progressValue: number;
  let targetValue: number;

  if (goal.mode === 'maintain') {
    unit = 'days';
    targetValue = goal.targetDays > 0 ? goal.targetDays : MAINTAIN_GOAL_DAYS;
    progressValue = Math.min(
      targetValue,
      Math.max(1, daysBetween(formatDateKey(goal.startedAt), endDateKey) + 1)
    );
  } else {
    targetValue = Math.max(
      1,
      goal.targetKcalDelta > 0
        ? goal.targetKcalDelta
        : Math.round((goal.targetKg ?? 0) * KCAL_PER_KG)
    );
    progressValue = sumGoalCalorieDelta(goal.mode, summaries, maintenanceCalories);
  }

  return {
    goal,
    progressValue,
    targetValue,
    progressPercent: Math.min(100, Math.round((progressValue / targetValue) * 100)),
    remainingValue: Math.max(0, targetValue - progressValue),
    unit,
    completed: progressValue >= targetValue,
    expectedEndDate,
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

    if (!summary || summary.consumedCalories <= 0) {
      break;
    }

    const goalState = getDailyCalorieGoalState(
      profile,
      summary.calorieTarget,
      summary.consumedCalories,
      dateKey,
      summary.goalMode
    );

    if (goalState !== 'on_target') {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

import type { TFunction } from 'i18next';
import type { WeightGoal, WeightGoalProgress } from '../types';

type TranslateFn = TFunction<'translation'>;
const DEFAULT_GOAL_CYCLE_DAYS = 30;

export function formatWeightGoalTitle(
  t: TranslateFn,
  goal: Pick<WeightGoal, 'mode' | 'targetKg' | 'targetDays'>
) {
  if (goal.mode === 'maintain') {
    if (goal.targetDays >= 30 && goal.targetDays % 30 === 0) {
      const months = goal.targetDays / 30;
      return t(
        months === 1
          ? 'goalTracking.goalNames.maintainWithOneMonth'
          : 'goalTracking.goalNames.maintainWithMonths',
        {
          value: months,
        }
      );
    }

    return t('goalTracking.goalNames.maintainWithValue', {
      value: goal.targetDays,
    });
  }

  if (goal.mode === 'gain') {
    return t('goalTracking.goalNames.gainWithValue', {
      value: goal.targetKg ?? 1,
    });
  }

  return t('goalTracking.goalNames.loseWithValue', {
    value: goal.targetKg ?? 1,
  });
}

export function getGoalCycleDayProgress(
  goalProgress: Pick<WeightGoalProgress, 'goal' | 'unit'>
): { current: number; target: number } | null {
  if (goalProgress.unit === 'days') {
    return null;
  }

  const startedAt = new Date(goalProgress.goal.startedAt);
  const today = new Date();
  const startedAtDay = new Date(startedAt.getFullYear(), startedAt.getMonth(), startedAt.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsedMs = todayDay.getTime() - startedAtDay.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  return {
    current: Math.min(DEFAULT_GOAL_CYCLE_DAYS, Math.max(1, elapsedDays + 1)),
    target: DEFAULT_GOAL_CYCLE_DAYS,
  };
}

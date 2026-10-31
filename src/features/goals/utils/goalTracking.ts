import type { TFunction } from 'i18next';
import type { WeightGoal } from '../types';

type TranslateFn = TFunction<'translation'>;

export function formatWeightGoalTitle(
  t: TranslateFn,
  goal: Pick<WeightGoal, 'mode' | 'targetKg' | 'targetDays'>
) {
  if (goal.mode === 'maintain') {
    // Maintain goals no longer have a length; older ones ran a set number of days.
    if (goal.targetDays <= 0) {
      return t('goalTracking.goalNames.maintain');
    }

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

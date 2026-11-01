import type { WeightGoal } from '../types';

/**
 * Only one goal may run. When two devices each started one, the most recently changed goal
 * keeps running and the others are returned to be cancelled.
 */
export function findSupersededActiveGoals(goals: WeightGoal[]): WeightGoal[] {
  const active = goals
    .filter((goal) => goal.status === 'active')
    .sort(
      (first, second) =>
        Date.parse(second.updatedAt) - Date.parse(first.updatedAt) ||
        Date.parse(second.startedAt) - Date.parse(first.startedAt) ||
        second.id.localeCompare(first.id)
    );

  return active.slice(1);
}

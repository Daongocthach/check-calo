import { BUDDY_AXES, MIN_SCORED_DAYS, RECENT_DAYS } from '../constants/stats';
import type { AxisScores, BuddyDayScore, BuddyStats } from '../types';

/** Average per stat; a stat with fewer than `MIN_SCORED_DAYS` days of data stays null. */
export function averageScores(days: Pick<BuddyDayScore, 'scores'>[]): AxisScores {
  const result = {} as AxisScores;

  for (const axis of BUDDY_AXES) {
    const values = days
      .map((day) => day.scores[axis])
      .filter((value): value is number => value !== null);

    result[axis] =
      values.length < MIN_SCORED_DAYS
        ? null
        : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  return result;
}

/** Overall and recent averages over finished days; today is left out until it ends. */
export function aggregateBuddyStats(days: BuddyDayScore[]): BuddyStats {
  const finished = days.filter((day) => !day.isToday);

  return {
    overall: averageScores(finished),
    recent: averageScores(finished.slice(-RECENT_DAYS)),
    loggedDays: finished.filter((day) => day.logged).length,
    days,
  };
}

import type { ActivityStats } from '@/features/achievements/types';
import { BUDDY_LEVELS, LEGACY_POINTS } from '../constants/levels';
import type { BuddyProgress } from '../types';

/** Points the diary earned under the rules before quests. */
export function calculateLegacyPoints(stats: ActivityStats) {
  return (
    Math.floor(stats.longestStreak / 7) * LEGACY_POINTS.streakWeek +
    stats.onTargetDays * LEGACY_POINTS.onTargetDay +
    stats.balancedDays * LEGACY_POINTS.balancedDay +
    stats.loggedDays * LEGACY_POINTS.loggedDay
  );
}

/** The level `points` reach and how far along the next one is. */
export function calculateBuddyProgress(points: number): BuddyProgress {
  let currentIndex = 0;
  BUDDY_LEVELS.forEach((level, index) => {
    if (points >= level.minPoints) {
      currentIndex = index;
    }
  });

  const current = BUDDY_LEVELS[currentIndex];
  const next = BUDDY_LEVELS[currentIndex + 1] ?? null;
  const progressPercent = next
    ? Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100;

  return { points, current, next, progressPercent };
}

import type { ActivityStats } from '@/features/achievements/types';
import { BUDDY_LEVELS, BUDDY_POINTS } from '../constants/levels';
import type { BuddyProgress } from '../types';

export function calculateBuddyProgress(stats: ActivityStats): BuddyProgress {
  const breakdown = {
    streakBonus: Math.floor(stats.longestStreak / 7) * BUDDY_POINTS.streakWeek,
    onTargetDays: stats.onTargetDays * BUDDY_POINTS.onTargetDay,
    balancedDays: stats.balancedDays * BUDDY_POINTS.balancedDay,
    loggedDays: stats.loggedDays * BUDDY_POINTS.loggedDay,
  };
  const points =
    breakdown.streakBonus + breakdown.onTargetDays + breakdown.balancedDays + breakdown.loggedDays;

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

  return { points, current, next, progressPercent, breakdown };
}

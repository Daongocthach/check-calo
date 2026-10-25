import { describe, expect, it } from '@jest/globals';
import type { ActivityStats } from '@/features/achievements/types';
import { calculateBuddyProgress } from './buddyProgress';

function stats(overrides: Partial<ActivityStats>): ActivityStats {
  return {
    loggedDays: 0,
    onTargetDays: 0,
    proteinDays: 0,
    balancedDays: 0,
    totalEntries: 0,
    currentStreak: 0,
    longestStreak: 0,
    dayStatuses: {},
    ...overrides,
  };
}

describe('calculateBuddyProgress', () => {
  it('starts at level 1 with no activity', () => {
    const progress = calculateBuddyProgress(stats({}));

    expect(progress.points).toBe(0);
    expect(progress.current.level).toBe(1);
    expect(progress.next?.level).toBe(2);
    expect(progress.progressPercent).toBe(0);
  });

  it('adds streak, on-target, balanced and logged-day points', () => {
    // 14-day streak = 2 weeks * 150, 10 on-target * 20, 4 balanced * 15, 14 logged * 10
    const progress = calculateBuddyProgress(
      stats({ longestStreak: 14, onTargetDays: 10, balancedDays: 4, loggedDays: 14 })
    );

    expect(progress.points).toBe(300 + 200 + 60 + 140);
    expect(progress.current.level).toBe(2);
    expect(progress.progressPercent).toBe(80);
  });

  it('caps at the master level', () => {
    const progress = calculateBuddyProgress(stats({ longestStreak: 140, onTargetDays: 100 }));

    expect(progress.current.level).toBe(5);
    expect(progress.next).toBeNull();
    expect(progress.progressPercent).toBe(100);
  });
});

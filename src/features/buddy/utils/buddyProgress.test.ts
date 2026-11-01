import { describe, expect, it } from '@jest/globals';
import type { ActivityStats } from '@/features/achievements/types';
import { calculateBuddyProgress, calculateLegacyPoints } from './buddyProgress';

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

describe('calculateLegacyPoints', () => {
  it('adds streak, on-target, balanced and logged-day points the old way', () => {
    // 14-day streak = 2 weeks * 150, 10 on-target * 20, 4 balanced * 15, 14 logged * 10.
    expect(
      calculateLegacyPoints(
        stats({ longestStreak: 14, onTargetDays: 10, balancedDays: 4, loggedDays: 14 })
      )
    ).toBe(300 + 200 + 60 + 140);
  });
});

describe('calculateBuddyProgress', () => {
  it('starts at level 1 with no points', () => {
    const progress = calculateBuddyProgress(0);

    expect(progress.current.level).toBe(1);
    expect(progress.next?.level).toBe(2);
    expect(progress.progressPercent).toBe(0);
  });

  it('keeps the stage each old level threshold reached', () => {
    expect(calculateBuddyProgress(300).current).toMatchObject({ level: 3, stage: 'junior' });
    expect(calculateBuddyProgress(800).current.stage).toBe('teen');
    expect(calculateBuddyProgress(1500).current.stage).toBe('buddy');
    expect(calculateBuddyProgress(2500).current).toMatchObject({ level: 9, stage: 'master' });
  });

  it('shows the way to the next level and stops at the top', () => {
    expect(calculateBuddyProgress(425).progressPercent).toBe(50);
    expect(calculateBuddyProgress(9000)).toMatchObject({ next: null, progressPercent: 100 });
  });
});

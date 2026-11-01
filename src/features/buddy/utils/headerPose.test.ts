import { describe, expect, it } from '@jest/globals';
import type { ActivityStats } from '@/features/achievements/types';
import { WEEKDAY_SCHEDULE } from '../constants/headerSchedule';
import {
  detectHeaderEvents,
  getHeaderPose,
  getNextPoseChange,
  getScheduledPose,
  isStreakMilestoneDay,
} from './headerPose';

// 2026-11-02 is a Monday, 2026-11-07 a Saturday.
const monday = (hours: number, minutes = 0) => new Date(2026, 10, 2, hours, minutes);
const saturday = (hours: number, minutes = 0) => new Date(2026, 10, 7, hours, minutes);
const noEvents = { leveledUp: false, badgeUnlocked: false, streakMilestone: false };

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

describe('getScheduledPose', () => {
  it('follows the weekday slots', () => {
    expect(getScheduledPose(monday(2))).toBe('sleep');
    expect(getScheduledPose(monday(5, 30))).toBe('box');
    expect(getScheduledPose(monday(8, 15))).toBe('bus');
    expect(getScheduledPose(monday(12))).toBe('noodles');
    expect(getScheduledPose(monday(13, 59))).toBe('rolling');
    expect(getScheduledPose(monday(19))).toBe('popcorn');
  });

  it('switches at the start of a slot', () => {
    expect(getScheduledPose(monday(10, 59))).not.toBe('noodles');
    expect(getScheduledPose(monday(11))).toBe('noodles');
  });

  it('picks one of the slot poses and keeps it for the whole slot', () => {
    const first = getScheduledPose(monday(9));

    expect(['laptop', 'focus']).toContain(first);
    expect(getScheduledPose(monday(10, 59))).toBe(first);
  });

  it('rotates the pick from day to day', () => {
    const picks = new Set([2, 3, 4].map((day) => getScheduledPose(new Date(2026, 10, day, 9, 30))));

    expect(picks).toEqual(new Set(['laptop', 'focus']));
  });

  it('uses the weekend slots during the day on Saturday and Sunday', () => {
    expect(getScheduledPose(saturday(12))).toBe('beach');
    expect(getScheduledPose(saturday(15))).toBe('hammock');
    expect(getScheduledPose(saturday(17, 30))).not.toBe('gym');
  });

  it('keeps the weekday evening and night on the weekend', () => {
    expect(getScheduledPose(saturday(2))).toBe('sleep');
    expect(getScheduledPose(saturday(19))).toBe('popcorn');
  });
});

describe('getHeaderPose', () => {
  it('lets events win in order', () => {
    const date = monday(12);

    expect(
      getHeaderPose(date, { leveledUp: true, badgeUnlocked: true, streakMilestone: true })
    ).toBe('gift');
    expect(getHeaderPose(date, { ...noEvents, badgeUnlocked: true, streakMilestone: true })).toBe(
      'trophy'
    );
    expect(getHeaderPose(date, { ...noEvents, streakMilestone: true })).toBe('fire');
  });

  it('shows the coin on the first of the month', () => {
    expect(getHeaderPose(new Date(2026, 11, 1, 12), noEvents)).toBe('coin');
  });

  it('falls back to the schedule', () => {
    expect(getHeaderPose(monday(12), noEvents)).toBe('noodles');
  });
});

describe('getNextPoseChange', () => {
  it('returns the start of the next slot', () => {
    expect(getNextPoseChange(monday(6, 45))).toEqual(monday(8));
    expect(getNextPoseChange(monday(15))).toEqual(monday(15, 30));
  });

  it('returns midnight after the last slot', () => {
    expect(getNextPoseChange(monday(23))).toEqual(new Date(2026, 10, 3, 0, 0));
  });

  it('uses the weekend boundaries on the weekend', () => {
    expect(getNextPoseChange(saturday(16))).toEqual(saturday(16, 30));
  });

  it('starts the weekday schedule at midnight', () => {
    expect(WEEKDAY_SCHEDULE[0].from).toBe(0);
  });
});

describe('isStreakMilestoneDay', () => {
  it('is true when today completes a milestone', () => {
    expect(
      isStreakMilestoneDay(
        stats({ currentStreak: 7, dayStatuses: { '2026-11-02': 'off_target' } }),
        '2026-11-02'
      )
    ).toBe(true);
  });

  it('is false while today is still empty', () => {
    expect(isStreakMilestoneDay(stats({ currentStreak: 7 }), '2026-11-02')).toBe(false);
  });

  it('is false between milestones', () => {
    expect(
      isStreakMilestoneDay(
        stats({ currentStreak: 8, dayStatuses: { '2026-11-02': 'on_target' } }),
        '2026-11-02'
      )
    ).toBe(false);
  });
});

describe('detectHeaderEvents', () => {
  it('does not celebrate on the first run', () => {
    const result = detectHeaderEvents(null, { level: 3, unlockedCount: 2 }, '2026-11-02');

    expect(result.leveledUp).toBe(false);
    expect(result.badgeUnlocked).toBe(false);
    expect(result.next).toEqual({
      level: 3,
      unlockedCount: 2,
      levelUpDate: null,
      badgeDate: null,
    });
  });

  it('dates a level-up and a new badge to today', () => {
    const previous = { level: 2, unlockedCount: 1, levelUpDate: null, badgeDate: null };
    const result = detectHeaderEvents(previous, { level: 3, unlockedCount: 2 }, '2026-11-02');

    expect(result.leveledUp).toBe(true);
    expect(result.badgeUnlocked).toBe(true);
  });

  it('keeps celebrating for the rest of that day only', () => {
    const previous = { level: 3, unlockedCount: 2, levelUpDate: '2026-11-02', badgeDate: null };

    expect(
      detectHeaderEvents(previous, { level: 3, unlockedCount: 2 }, '2026-11-02').leveledUp
    ).toBe(true);
    expect(
      detectHeaderEvents(previous, { level: 3, unlockedCount: 2 }, '2026-11-03').leveledUp
    ).toBe(false);
  });

  it('does not celebrate going down, e.g. after signing out', () => {
    const previous = { level: 3, unlockedCount: 2, levelUpDate: null, badgeDate: null };
    const result = detectHeaderEvents(previous, { level: 1, unlockedCount: 0 }, '2026-11-02');

    expect(result.leveledUp).toBe(false);
    expect(result.next.level).toBe(1);
  });
});

import type { ActivityStats } from '@/features/achievements/types';
import {
  STREAK_MILESTONES,
  WEEKDAY_SCHEDULE,
  WEEKEND_DAYTIME,
  WEEKEND_DAYTIME_SCHEDULE,
} from '../constants/headerSchedule';
import type { PoseSlot } from '../constants/headerSchedule';
import type { MascotPose } from '../constants/mascot';

export interface HeaderPoseEvents {
  leveledUp: boolean;
  badgeUnlocked: boolean;
  streakMilestone: boolean;
}

/** What the header last saw, so a level-up or new badge can be celebrated for the rest of that day. */
export interface HeaderSeenState {
  level: number;
  unlockedCount: number;
  /** YYYY-MM-DD of the last level-up seen. */
  levelUpDate: string | null;
  /** YYYY-MM-DD of the last badge unlock seen. */
  badgeDate: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function slotsFor(date: Date): readonly PoseSlot[] {
  if (!isWeekend(date)) {
    return WEEKDAY_SCHEDULE;
  }

  return [
    ...WEEKDAY_SCHEDULE.filter(
      (slot) => slot.from < WEEKEND_DAYTIME.from || slot.from >= WEEKEND_DAYTIME.until
    ),
    ...WEEKEND_DAYTIME_SCHEDULE,
  ].sort((left, right) => left.from - right.from);
}

/** Calendar day count, so every slot rotates its poses once a day. */
function dayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

export function getScheduledPose(date: Date): MascotPose {
  const slots = slotsFor(date);
  const minutes = minutesOfDay(date);
  const index = slots.reduce(
    (current, slot, slotIndex) => (slot.from <= minutes ? slotIndex : current),
    0
  );
  const { poses } = slots[index];

  return poses[(dayNumber(date) + index) % poses.length];
}

/** Events win over the schedule: level-up, then a new badge, then a streak milestone, then the 1st. */
export function getHeaderPose(date: Date, events: HeaderPoseEvents): MascotPose {
  if (events.leveledUp) return 'gift';
  if (events.badgeUnlocked) return 'trophy';
  if (events.streakMilestone) return 'fire';
  if (date.getDate() === 1) return 'coin';

  return getScheduledPose(date);
}

/** When the scheduled pose next changes: the start of the next slot, or midnight. */
export function getNextPoseChange(date: Date): Date {
  const minutes = minutesOfDay(date);
  const next = slotsFor(date).find((slot) => slot.from > minutes);
  const change = new Date(date);

  if (next) {
    change.setHours(0, next.from, 0, 0);
  } else {
    change.setHours(24, 0, 0, 0);
  }

  return change;
}

/** A streak milestone counts on the day it is reached, i.e. when today is already logged. */
export function isStreakMilestoneDay(stats: ActivityStats, todayKey: string) {
  const today = stats.dayStatuses[todayKey];
  return (
    STREAK_MILESTONES.includes(stats.currentStreak) && today !== undefined && today !== 'empty'
  );
}

/** Compares the current level and badge count with what was seen last and dates any increase. */
export function detectHeaderEvents(
  previous: HeaderSeenState | null,
  current: { level: number; unlockedCount: number },
  todayKey: string
) {
  // First run: remember where the user is without celebrating progress made before.
  const next: HeaderSeenState = previous
    ? {
        level: current.level,
        unlockedCount: current.unlockedCount,
        levelUpDate: current.level > previous.level ? todayKey : previous.levelUpDate,
        badgeDate: current.unlockedCount > previous.unlockedCount ? todayKey : previous.badgeDate,
      }
    : { ...current, levelUpDate: null, badgeDate: null };

  return {
    next,
    leveledUp: next.levelUpDate === todayKey,
    badgeUnlocked: next.badgeDate === todayKey,
  };
}

export const STREAK_STATUS = {
  NONE: 0,
  COMPLETED: 1,
  MISSED_GOAL: 2,
} as const;

export type StreakStatus = (typeof STREAK_STATUS)[keyof typeof STREAK_STATUS];

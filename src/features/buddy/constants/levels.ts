import type { BuddyLevelDefinition } from '../types';

export const BUDDY_LEVELS: BuddyLevelDefinition[] = [
  { level: 1, stage: 'baby', minPoints: 0 },
  { level: 2, stage: 'junior', minPoints: 300 },
  { level: 3, stage: 'teen', minPoints: 800 },
  { level: 4, stage: 'buddy', minPoints: 1500 },
  { level: 5, stage: 'master', minPoints: 2500 },
];

export const BUDDY_POINTS = {
  /** Awarded for every 7 consecutive logged days (longest streak). */
  streakWeek: 150,
  onTargetDay: 20,
  balancedDay: 15,
  loggedDay: 10,
} as const;

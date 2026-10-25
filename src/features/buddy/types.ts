export type BuddyLevel = 1 | 2 | 3 | 4 | 5;

export type BuddyStage = 'baby' | 'junior' | 'teen' | 'buddy' | 'master';

export interface BuddyLevelDefinition {
  level: BuddyLevel;
  stage: BuddyStage;
  /** Points needed to reach this level. */
  minPoints: number;
}

export interface BuddyPointBreakdown {
  streakBonus: number;
  onTargetDays: number;
  balancedDays: number;
  loggedDays: number;
}

export interface BuddyProgress {
  points: number;
  current: BuddyLevelDefinition;
  next: BuddyLevelDefinition | null;
  /** 0-100 progress toward the next level (100 at max level). */
  progressPercent: number;
  breakdown: BuddyPointBreakdown;
}

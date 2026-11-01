import type { DailyNutritionSummary } from '@/features/food-log/types';

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

/** The six stats on Buddy's hexagon, clockwise from the top. */
export type BuddyAxis = 'calories' | 'nutrients' | 'quality' | 'timing' | 'meals' | 'consistency';

/** 0-100 per stat; null when there is not enough data to judge it. */
export type AxisScores = Record<BuddyAxis, number | null>;

/** When a day's food was eaten, as far as the main meals go. */
export interface DayMeals {
  /** Main meals (breakfast, lunch, dinner) with something logged. */
  main: number;
  /** Main meals eaten on time. */
  onTime: number;
  /** Something was eaten late at night. */
  lateNight: boolean;
}

export interface BuddyDayScore {
  date: string;
  /** Today still counts toward nothing: the day is not over. */
  isToday: boolean;
  logged: boolean;
  summary: DailyNutritionSummary;
  meals: DayMeals;
  /** Share of the day's calories from food with fiber, sugar or sodium known (0-1). */
  nutrientCoverage: number;
  scores: AxisScores;
}

export interface BuddyStats {
  /** Average over every finished day since the first log. */
  overall: AxisScores;
  /** Average over the last seven finished days. */
  recent: AxisScores;
  /** Finished days with something logged. */
  loggedDays: number;
  /** Every day from the first log through today, oldest first. */
  days: BuddyDayScore[];
}

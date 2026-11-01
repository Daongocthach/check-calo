import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import type { WeightGoalMode } from '@/features/goals/types';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type BuddyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type BuddyStage = 'baby' | 'junior' | 'teen' | 'buddy' | 'master';

export interface BuddyLevelDefinition {
  level: BuddyLevel;
  stage: BuddyStage;
  /** Points needed to reach this level. */
  minPoints: number;
}

export interface BuddyProgress {
  points: number;
  current: BuddyLevelDefinition;
  next: BuddyLevelDefinition | null;
  /** 0-100 progress toward the next level (100 at max level). */
  progressPercent: number;
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

export type QuestKind = 'daily' | 'weekly' | 'special';

/** What a quest checks; the app knows how to check each of these. */
export type QuestMetric =
  | 'first_log'
  | 'calorie_goal'
  | 'diverse_menu'
  | 'within_limits'
  | 'fiber_enough'
  | 'pet_level_up'
  | 'weight_goal_reached'
  | 'create_account';

/** A quest as configured in Supabase (`buddy_quests`), or the built-in default. */
export interface BuddyQuest {
  id: string;
  kind: QuestKind;
  metric: QuestMetric;
  /** Weekly quests: days of the week that must meet the metric. */
  requiredDays: number;
  /** Null: every goal. */
  goalModes: WeightGoalMode[] | null;
  points: number;
  /** Title by language code. */
  title: Record<string, string>;
  icon: IoniconName;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

/** One quest completed for one period, with the points it earned at the time. */
export interface QuestCompletion {
  questId: string;
  periodKey: string;
  points: number;
  completedAt: string;
}

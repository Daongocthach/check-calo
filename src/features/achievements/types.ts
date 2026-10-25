export type DayStatus = 'on_target' | 'off_target' | 'empty';

export interface ActivityStats {
  /** Days with at least one logged food. */
  loggedDays: number;
  /** Logged days that stayed within the calorie goal. */
  onTargetDays: number;
  /** Logged days that reached at least 80% of the protein target. */
  proteinDays: number;
  /** Logged days where carbs, protein and fat each reached 70% of target. */
  balancedDays: number;
  totalEntries: number;
  /** Consecutive logged days ending today (or yesterday when today is still empty). */
  currentStreak: number;
  longestStreak: number;
  /** Status per date key (YYYY-MM-DD) for every day since the first entry. */
  dayStatuses: Record<string, DayStatus>;
}

export type AchievementId =
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'on_target_7'
  | 'protein_5'
  | 'balanced_7'
  | 'entries_10'
  | 'entries_100';

export interface AchievementDefinition {
  id: AchievementId;
  icon: 'flame' | 'shield-checkmark' | 'barbell' | 'nutrition' | 'restaurant' | 'ribbon' | 'heart';
  target: number;
  metric: (stats: ActivityStats) => number;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  value: number;
  unlocked: boolean;
}

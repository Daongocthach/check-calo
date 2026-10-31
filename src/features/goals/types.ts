export type WeightGoalMode = 'lose' | 'gain' | 'maintain';
export type WeightGoalStatus = 'active' | 'completed' | 'cancelled';

export interface WeightGoal {
  id: string;
  mode: WeightGoalMode;
  targetKg: number | null;
  targetKcalDelta: number;
  targetDays: number;
  /** Null on goals created before weight tracking; those still measure calories. */
  startWeightKg: number | null;
  targetWeightKg: number | null;
  monthlyRateKg: number | null;
  status: WeightGoalStatus;
  startedAt: string;
  completedAt: string | null;
  /** When the goal stopped: reached, changed for another or ended. Null while active. */
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightGoalProgress {
  goal: WeightGoal;
  progressValue: number;
  targetValue: number;
  progressPercent: number;
  remainingValue: number;
  /**
   * Calories cut (lose) or added (gain) by the diary. Maintain goals count days: on-target
   * days out of the days the goal has run.
   */
  unit: 'kcal' | 'days';
  completed: boolean;
  /** YYYY-MM-DD the goal should finish by its plan; null for maintain goals, which never end. */
  expectedEndDate: string | null;
  /** Maintain goals: on-target days over the last week (or since the start); null otherwise. */
  recent: { onTargetDays: number; days: number } | null;
}

export interface WeightLog {
  /** YYYY-MM-DD; one weigh-in per day. */
  date: string;
  weightKg: number;
  createdAt: string;
  updatedAt: string;
}

export type AchievementKey =
  | 'goal_crusher'
  | 'fire_keeper_7'
  | 'fire_keeper_14'
  | 'first_maintain_goal';

export interface AchievementUnlock {
  id: string;
  achievementKey: AchievementKey;
  unlockedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTrackingSnapshot {
  activeGoal: WeightGoalProgress | null;
  latestCompletedGoal: WeightGoalProgress | null;
  goalHistory: WeightGoalProgress[];
  currentStreak: number;
  unlockedAchievements: AchievementUnlock[];
  newlyUnlockedAchievements: AchievementKey[];
  justCompletedGoal: WeightGoalProgress | null;
}

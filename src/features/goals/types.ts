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
  createdAt: string;
  updatedAt: string;
}

export interface WeightGoalProgress {
  goal: WeightGoal;
  progressValue: number;
  targetValue: number;
  progressPercent: number;
  remainingValue: number;
  consumedCalories: number;
  targetCalories: number;
  /** `kg` for weight goals; maintain weight goals count `days` like legacy ones. */
  unit: 'kcal' | 'days' | 'kg';
  completed: boolean;
  /** Weight goals only; null on legacy calorie goals. */
  weight: WeightGoalWeightProgress | null;
}

export interface WeightGoalWeightProgress {
  startKg: number;
  targetKg: number;
  /** Average of the latest week of weigh-ins since the goal started. */
  currentKg: number;
  /** Signed change since the start, positive in the goal's direction. */
  changeKg: number;
  /** YYYY-MM-DD the goal should be reached at its planned rate. */
  expectedEndDate: string;
  /** Maintain goals: whether the current weight is still within the band. */
  withinBand: boolean;
  /** YYYY-MM-DD of the latest weigh-in since the goal started; null when none. */
  lastWeighInDate: string | null;
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

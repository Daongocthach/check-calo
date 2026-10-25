export type WeightGoalMode = 'lose' | 'gain' | 'maintain';
export type WeightGoalStatus = 'active' | 'completed' | 'cancelled';

export interface WeightGoal {
  id: string;
  mode: WeightGoalMode;
  targetKg: number | null;
  targetKcalDelta: number;
  targetDays: number;
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
  unit: 'kcal' | 'days';
  completed: boolean;
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

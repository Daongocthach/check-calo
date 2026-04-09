import { getDatabase } from '@/services/database/sqlite';
import type {
  AchievementKey,
  AchievementUnlock,
  GoalTrackingSnapshot,
  NutritionTrendPoint,
  UserProfile,
  WeightGoal,
  WeightGoalMode,
  WeightGoalProgress,
  WeightGoalStatus,
} from '../types';
import {
  createEntityId,
  formatDateKey,
  getDailyCalorieGoalState,
  getWeightGoalMode,
  nowIsoString,
} from '../utils/calorie';
import { getUserProfile, listDailyNutritionSummaries } from './nutritionDatabase';

const KCAL_PER_KG = 7700;
const DEFAULT_TARGET_KG = 1;
const DEFAULT_MAINTAIN_DAYS = 7;
const MAINTENANCE_TOLERANCE_KCAL = 100;

interface WeightGoalRow {
  id: string;
  mode: WeightGoalMode;
  target_kg: number | null;
  target_kcal_delta: number;
  target_days: number;
  status: WeightGoalStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AchievementUnlockRow {
  id: string;
  achievement_key: AchievementKey;
  unlocked_at: string;
  created_at: string;
  updated_at: string;
}

function mapWeightGoal(row: WeightGoalRow): WeightGoal {
  return {
    id: row.id,
    mode: row.mode,
    targetKg: row.target_kg,
    targetKcalDelta: row.target_kcal_delta,
    targetDays: row.target_days,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAchievementUnlock(row: AchievementUnlockRow): AchievementUnlock {
  return {
    id: row.id,
    achievementKey: row.achievement_key,
    unlockedAt: row.unlocked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculateMaintainDayProgress(
  summaries: NutritionTrendPoint[],
  profile: UserProfile
): number {
  return summaries.reduce((count, summary) => {
    if (summary.consumedCalories <= 0) {
      return count;
    }

    return Math.abs(summary.consumedCalories - profile.maintenanceCalorieTarget) <=
      MAINTENANCE_TOLERANCE_KCAL
      ? count + 1
      : count;
  }, 0);
}

function calculateGoalProgress(
  goal: WeightGoal,
  summaries: NutritionTrendPoint[],
  profile: UserProfile
): WeightGoalProgress {
  if (goal.mode === 'maintain') {
    const progressValue = calculateMaintainDayProgress(summaries, profile);
    const targetValue = Math.max(1, goal.targetDays);
    const remainingValue = Math.max(0, targetValue - progressValue);

    return {
      goal,
      progressValue,
      targetValue,
      progressPercent: Math.min(100, Math.round((progressValue / targetValue) * 100)),
      remainingValue,
      unit: 'days',
      completed: progressValue >= targetValue,
    };
  }

  const progressValue = Math.round(
    summaries.reduce((total, summary) => {
      if (summary.consumedCalories <= 0) {
        return total;
      }

      if (goal.mode === 'lose') {
        return total + Math.max(0, profile.maintenanceCalorieTarget - summary.consumedCalories);
      }

      return total + Math.max(0, summary.consumedCalories - profile.maintenanceCalorieTarget);
    }, 0)
  );
  const targetValue = Math.max(1, goal.targetKcalDelta);
  const remainingValue = Math.max(0, targetValue - progressValue);

  return {
    goal,
    progressValue,
    targetValue,
    progressPercent: Math.min(100, Math.round((progressValue / targetValue) * 100)),
    remainingValue,
    unit: 'kcal',
    completed: progressValue >= targetValue,
  };
}

function getStreakFromSummaries(summaries: NutritionTrendPoint[], profile: UserProfile): number {
  const todayKey = formatDateKey(new Date());
  const summaryMap = new Map(summaries.map((summary) => [summary.date, summary]));
  const cursor = new Date(`${todayKey}T00:00:00`);
  let streak = 0;

  while (true) {
    const dateKey = formatDateKey(cursor);
    const summary = summaryMap.get(dateKey);

    if (!summary || summary.consumedCalories <= 0) {
      break;
    }

    const goalState = getDailyCalorieGoalState(
      profile,
      summary.calorieTarget,
      summary.consumedCalories
    );

    if (goalState !== 'on_target') {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

async function listSummariesSince(startedAt: string): Promise<NutritionTrendPoint[]> {
  const today = new Date();
  return listDailyNutritionSummaries(formatDateKey(startedAt), formatDateKey(today));
}

async function getActiveWeightGoalRow() {
  const database = await getDatabase();
  return database.getFirstAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status = 'active'
      ORDER BY started_at DESC
      LIMIT 1;
    `
  );
}

async function getLatestCompletedWeightGoalRow() {
  const database = await getDatabase();
  return database.getFirstAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status = 'completed'
      ORDER BY completed_at DESC, started_at DESC
      LIMIT 1;
    `
  );
}

async function listAchievementUnlockRows() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<AchievementUnlockRow>(
    `
      SELECT *
      FROM achievement_unlocks
      ORDER BY unlocked_at DESC;
    `
  );

  return rows.map(mapAchievementUnlock);
}

async function unlockAchievement(achievementKey: AchievementKey): Promise<boolean> {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM achievement_unlocks WHERE achievement_key = ? LIMIT 1;',
    [achievementKey]
  );

  if (existing) {
    return false;
  }

  const now = nowIsoString();

  await database.runAsync(
    `
      INSERT INTO achievement_unlocks (id, achievement_key, unlocked_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?);
    `,
    [createEntityId('achievement'), achievementKey, now, now, now]
  );

  return true;
}

async function markGoalCompleted(goal: WeightGoalProgress) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE weight_goals
      SET status = 'completed', completed_at = ?, updated_at = ?
      WHERE id = ?;
    `,
    [now, now, goal.goal.id]
  );

  return {
    ...goal,
    goal: {
      ...goal.goal,
      status: 'completed' as const,
      completedAt: now,
      updatedAt: now,
    },
    completed: true,
  } satisfies WeightGoalProgress;
}

function buildGoalInsert(mode: WeightGoalMode) {
  if (mode === 'maintain') {
    return {
      targetKg: null,
      targetKcalDelta: 0,
      targetDays: DEFAULT_MAINTAIN_DAYS,
    };
  }

  return {
    targetKg: DEFAULT_TARGET_KG,
    targetKcalDelta: DEFAULT_TARGET_KG * KCAL_PER_KG,
    targetDays: 0,
  };
}

export async function startWeightGoal(mode: WeightGoalMode) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existingActiveGoal = await getActiveWeightGoalRow();

  await database.withTransactionAsync(async () => {
    if (existingActiveGoal) {
      await database.runAsync(
        `
          UPDATE weight_goals
          SET status = 'cancelled', updated_at = ?
          WHERE id = ?;
        `,
        [now, existingActiveGoal.id]
      );
    }

    const preset = buildGoalInsert(mode);

    await database.runAsync(
      `
        INSERT INTO weight_goals (
          id,
          mode,
          target_kg,
          target_kcal_delta,
          target_days,
          status,
          started_at,
          completed_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?);
      `,
      [
        createEntityId('goal'),
        mode,
        preset.targetKg,
        preset.targetKcalDelta,
        preset.targetDays,
        now,
        now,
        now,
      ]
    );
  });
}

export async function continueLatestCompletedGoal() {
  const latestCompletedGoal = await getLatestCompletedWeightGoalRow();

  if (!latestCompletedGoal) {
    return false;
  }

  await startWeightGoal(latestCompletedGoal.mode);
  return true;
}

export async function ensureRecommendedGoalForProfile(profile: UserProfile) {
  const activeGoal = await getActiveWeightGoalRow();

  if (activeGoal) {
    return;
  }

  const latestCompletedGoal = await getLatestCompletedWeightGoalRow();

  if (latestCompletedGoal) {
    return;
  }

  await startWeightGoal(getWeightGoalMode(profile.monthlyWeightLossKg));
}

export async function syncGoalTracking(): Promise<GoalTrackingSnapshot> {
  const profile = await getUserProfile();

  if (!profile) {
    return {
      activeGoal: null,
      latestCompletedGoal: null,
      currentStreak: 0,
      unlockedAchievements: await listAchievementUnlockRows(),
      newlyUnlockedAchievements: [],
      justCompletedGoal: null,
    };
  }

  await ensureRecommendedGoalForProfile(profile);

  const achievementKeys: AchievementKey[] = [];
  const allRecentSummaries = await listDailyNutritionSummaries(
    formatDateKey(new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)),
    formatDateKey(new Date())
  );
  const currentStreak = getStreakFromSummaries(allRecentSummaries, profile);

  if (currentStreak >= 7 && (await unlockAchievement('fire_keeper_7'))) {
    achievementKeys.push('fire_keeper_7');
  }

  if (currentStreak >= 14 && (await unlockAchievement('fire_keeper_14'))) {
    achievementKeys.push('fire_keeper_14');
  }

  let justCompletedGoal: WeightGoalProgress | null = null;
  let activeGoalSnapshot: WeightGoalProgress | null = null;
  const activeGoalRow = await getActiveWeightGoalRow();

  if (activeGoalRow) {
    const activeGoal = mapWeightGoal(activeGoalRow);
    const summaries = await listSummariesSince(activeGoal.startedAt);
    const progress = calculateGoalProgress(activeGoal, summaries, profile);

    if (progress.completed) {
      justCompletedGoal = await markGoalCompleted(progress);

      if (await unlockAchievement('goal_crusher')) {
        achievementKeys.push('goal_crusher');
      }

      if (justCompletedGoal.goal.mode === 'maintain') {
        if (await unlockAchievement('first_maintain_goal')) {
          achievementKeys.push('first_maintain_goal');
        }
      }
    } else {
      activeGoalSnapshot = progress;
    }
  }

  const latestCompletedRow = await getLatestCompletedWeightGoalRow();
  let latestCompletedGoal: WeightGoalProgress | null = null;

  if (latestCompletedRow) {
    const completedGoal = mapWeightGoal(latestCompletedRow);
    const summaries = await listSummariesSince(completedGoal.startedAt);
    latestCompletedGoal = calculateGoalProgress(completedGoal, summaries, profile);
  }

  return {
    activeGoal: activeGoalSnapshot,
    latestCompletedGoal,
    currentStreak,
    unlockedAchievements: await listAchievementUnlockRows(),
    newlyUnlockedAchievements: achievementKeys,
    justCompletedGoal,
  };
}

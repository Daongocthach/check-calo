import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { syncCurrentUserLeaderboardProfile } from '@/features/leaderboard/services/leaderboardService';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import type { UserProfile } from '@/features/profile/types';
import { getDailyCalorieGoalState, getWeightGoalMode } from '@/features/profile/utils/calorie';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import type {
  AchievementKey,
  AchievementUnlock,
  GoalTrackingSnapshot,
  WeightGoal,
  WeightGoalMode,
  WeightGoalProgress,
  WeightGoalStatus,
  WeightLog,
} from '../types';
import { calculateWeightGoalProgress, MAINTAIN_GOAL_DAYS, roundKg } from '../utils/weightGoal';
import { listWeightLogs } from './weightLogRepository';

const KCAL_PER_KG = 7700;
const DEFAULT_TARGET_KG = 1;
const MAINTENANCE_TOLERANCE_KCAL = 100;

interface WeightGoalPreset {
  targetKg: number | null;
  targetKcalDelta: number;
  targetDays: number;
  startWeightKg: number;
  targetWeightKg: number;
  monthlyRateKg: number;
}

interface WeightGoalRow {
  id: string;
  mode: WeightGoalMode;
  target_kg: number | null;
  target_kcal_delta: number;
  target_days: number;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  monthly_rate_kg: number | null;
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
    startWeightKg: row.start_weight_kg,
    targetWeightKg: row.target_weight_kg,
    monthlyRateKg: row.monthly_rate_kg,
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

/** Goals from before weight tracking measure the calorie deficit or surplus instead. */
function calculateLegacyGoalProgress(
  goal: WeightGoal,
  summaries: NutritionTrendPoint[],
  profile: UserProfile
): WeightGoalProgress {
  const consumedCalories = Math.round(
    summaries.reduce((total, summary) => total + Math.max(0, summary.consumedCalories), 0)
  );
  const targetCalories = Math.round(
    summaries.reduce((total, summary) => total + Math.max(0, summary.calorieTarget), 0)
  );

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
      consumedCalories,
      targetCalories,
      unit: 'days',
      completed: progressValue >= targetValue,
      weight: null,
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
    consumedCalories,
    targetCalories,
    unit: 'kcal',
    completed: progressValue >= targetValue,
    weight: null,
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
      summary.consumedCalories,
      dateKey,
      summary.goalMode
    );

    if (goalState !== 'on_target') {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function listSummariesBetween(startedAt: string, endedAt?: string | null) {
  return listDailyNutritionSummaries(
    formatDateKey(startedAt),
    formatDateKey(endedAt ?? new Date().toISOString())
  );
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

async function listHistoricalWeightGoalRows() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status != 'active'
      ORDER BY
        CASE WHEN completed_at IS NOT NULL THEN completed_at ELSE updated_at END DESC,
        started_at DESC;
    `
  );

  return rows.map(mapWeightGoal);
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
  const now = nowIsoString();

  const result = await database.runAsync(
    `
      INSERT INTO achievement_unlocks (id, achievement_key, unlocked_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(achievement_key) DO NOTHING;
    `,
    [createEntityId('achievement'), achievementKey, now, now, now]
  );

  return result.changes > 0;
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

function getPlannedTargetWeightKg(mode: WeightGoalMode, profile: UserProfile) {
  if (mode === 'maintain') {
    return profile.weightKg;
  }

  if (profile.targetWeightKg !== null) {
    return profile.targetWeightKg;
  }

  // Profiles saved before target weights aim a month of change (at least 1 kg) away.
  const fallbackChangeKg = Math.max(DEFAULT_TARGET_KG, Math.abs(profile.monthlyWeightGoalKg));
  return mode === 'lose'
    ? profile.weightKg - fallbackChangeKg
    : profile.weightKg + fallbackChangeKg;
}

function buildGoalInsert(mode: WeightGoalMode, profile: UserProfile): WeightGoalPreset {
  const startWeightKg = roundKg(profile.weightKg);
  const targetWeightKg = roundKg(getPlannedTargetWeightKg(mode, profile));
  const targetKg = mode === 'maintain' ? null : roundKg(Math.abs(startWeightKg - targetWeightKg));

  return {
    targetKg,
    targetKcalDelta: targetKg ? Math.round(targetKg * KCAL_PER_KG) : 0,
    targetDays: mode === 'maintain' ? MAINTAIN_GOAL_DAYS : 0,
    startWeightKg,
    targetWeightKg,
    monthlyRateKg: Math.abs(profile.monthlyWeightGoalKg),
  };
}

/** A new weigh-in keeps the goal; a new mode, target weight or rate means a new goal. */
function isSameGoalPlan(
  goal: WeightGoalRow,
  mode: WeightGoalMode,
  preset: WeightGoalPreset,
  profile: UserProfile
) {
  if (goal.start_weight_kg === null || goal.mode !== mode) {
    return false;
  }

  if (mode === 'maintain') {
    return true;
  }

  const sameTarget =
    profile.targetWeightKg === null ||
    (goal.target_weight_kg !== null && roundKg(goal.target_weight_kg) === preset.targetWeightKg);

  return sameTarget && goal.monthly_rate_kg === preset.monthlyRateKg;
}

async function insertWeightGoal(
  database: Awaited<ReturnType<typeof getDatabase>>,
  mode: WeightGoalMode,
  preset: WeightGoalPreset,
  now: string
) {
  await database.runAsync(
    `
      INSERT INTO weight_goals (
        id,
        mode,
        target_kg,
        target_kcal_delta,
        target_days,
        start_weight_kg,
        target_weight_kg,
        monthly_rate_kg,
        status,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?);
    `,
    [
      createEntityId('goal'),
      mode,
      preset.targetKg,
      preset.targetKcalDelta,
      preset.targetDays,
      preset.startWeightKg,
      preset.targetWeightKg,
      preset.monthlyRateKg,
      now,
      now,
      now,
    ]
  );
}

async function startWeightGoal(mode: WeightGoalMode, preset: WeightGoalPreset) {
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

    await insertWeightGoal(database, mode, preset, now);
  });
}

/**
 * Starts a goal from the profile's plan unless the active goal already follows it. A
 * reached weight target is not restarted until the user picks a new plan.
 */
export async function syncActiveGoalToProfile(profile: UserProfile) {
  const activeGoal = await getActiveWeightGoalRow();
  const mode = getWeightGoalMode(profile.monthlyWeightGoalKg);
  const preset = buildGoalInsert(mode, profile);

  if (activeGoal) {
    if (!isSameGoalPlan(activeGoal, mode, preset, profile)) {
      await startWeightGoal(mode, preset);
    }
    return;
  }

  const latestCompletedGoal = await getLatestCompletedWeightGoalRow();

  if (
    mode !== 'maintain' &&
    latestCompletedGoal &&
    isSameGoalPlan(latestCompletedGoal, mode, preset, profile)
  ) {
    return;
  }

  await startWeightGoal(mode, preset);
}

async function getGoalProgress(
  goal: WeightGoal,
  profile: UserProfile,
  logs: WeightLog[],
  endedAt?: string | null
): Promise<WeightGoalProgress> {
  const endDateKey = formatDateKey(endedAt ?? new Date());

  if (goal.startWeightKg !== null) {
    return calculateWeightGoalProgress(
      goal,
      logs.filter((log) => log.date <= endDateKey),
      endDateKey
    );
  }

  return calculateLegacyGoalProgress(
    goal,
    await listSummariesBetween(goal.startedAt, endedAt),
    profile
  );
}

export async function syncGoalTracking(): Promise<GoalTrackingSnapshot> {
  const profile = await getUserProfile();

  if (!profile) {
    return {
      activeGoal: null,
      latestCompletedGoal: null,
      goalHistory: [],
      currentStreak: 0,
      unlockedAchievements: await listAchievementUnlockRows(),
      newlyUnlockedAchievements: [],
      justCompletedGoal: null,
    };
  }

  await syncActiveGoalToProfile(profile);

  const weightLogs = await listWeightLogs();
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
    const progress = await getGoalProgress(activeGoal, profile, weightLogs);

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
    latestCompletedGoal = await getGoalProgress(
      completedGoal,
      profile,
      weightLogs,
      completedGoal.completedAt ?? completedGoal.updatedAt
    );
  }

  const historicalGoals = await listHistoricalWeightGoalRows();
  const goalHistory = await Promise.all(
    historicalGoals.map((goal) =>
      getGoalProgress(goal, profile, weightLogs, goal.completedAt ?? goal.updatedAt)
    )
  );
  const completedGoals = goalHistory.filter((goal) => goal.completed).length;

  await syncCurrentUserLeaderboardProfile(profile, currentStreak, completedGoals);

  return {
    activeGoal: activeGoalSnapshot,
    latestCompletedGoal,
    goalHistory,
    currentStreak,
    unlockedAchievements: await listAchievementUnlockRows(),
    newlyUnlockedAchievements: achievementKeys,
    justCompletedGoal,
  };
}

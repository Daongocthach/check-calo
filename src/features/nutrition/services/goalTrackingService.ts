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
const DEFAULT_MAINTAIN_DAYS = 30;
const MAINTENANCE_TOLERANCE_KCAL = 100;

interface WeightGoalPreset {
  targetKg: number | null;
  targetKcalDelta: number;
  targetDays: number;
}

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

interface GoalTrackingDailyTotalsRow {
  entry_date: string;
  consumed_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
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
  const consumedCalories = Math.round(
    summaries.reduce((total, summary) => total + Math.max(0, summary.consumedCalories), 0)
  );
  const targetCalories = Math.round(
    Math.max(0, profile.maintenanceCalorieTarget) * goal.targetDays
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
  return listSummariesBetween(startedAt);
}

async function listSummariesBetween(
  startedAt: string,
  endedAt?: string | null
): Promise<NutritionTrendPoint[]> {
  const database = await getDatabase();
  const profile = await getUserProfile();
  const rangeEnd = endedAt ?? new Date().toISOString();
  const normalizedStartDate = formatDateKey(startedAt);
  const normalizedEndDate = formatDateKey(rangeEnd);
  const overrideRows = await database.getAllAsync<{
    date: string;
    calorie_target: number;
  }>(
    `
      SELECT date, calorie_target
      FROM daily_calorie_targets
      WHERE date >= ? AND date <= ?;
    `,
    [normalizedStartDate, normalizedEndDate]
  );
  const totalRows = await database.getAllAsync<GoalTrackingDailyTotalsRow>(
    `
      SELECT
        entry_date,
        COALESCE(SUM(total_calories), 0) AS consumed_calories,
        COALESCE(SUM(protein_grams), 0) AS protein_grams,
        COALESCE(SUM(carbs_grams), 0) AS carbs_grams,
        COALESCE(SUM(fat_grams), 0) AS fat_grams
      FROM food_entries
      WHERE entry_date >= ? AND entry_date <= ?
      GROUP BY entry_date
      ORDER BY entry_date ASC;
    `,
    [normalizedStartDate, normalizedEndDate]
  );

  const overrideMap = new Map(overrideRows.map((row) => [row.date, row.calorie_target]));
  const totalsMap = new Map(totalRows.map((row) => [row.entry_date, row]));
  const summaries: NutritionTrendPoint[] = [];
  const cursor = new Date(`${normalizedStartDate}T00:00:00`);
  const finalDate = new Date(`${normalizedEndDate}T00:00:00`);

  while (cursor <= finalDate) {
    const dateKey = formatDateKey(cursor);
    const totals = totalsMap.get(dateKey);
    const calorieTarget = overrideMap.get(dateKey) ?? profile?.dailyCalorieTarget ?? 0;

    summaries.push({
      date: dateKey,
      label: dateKey,
      calorieTarget,
      consumedCalories: totals?.consumed_calories ?? 0,
      remainingCalories: calorieTarget - (totals?.consumed_calories ?? 0),
      progressPercent:
        calorieTarget > 0
          ? Math.min(100, Math.round(((totals?.consumed_calories ?? 0) / calorieTarget) * 100))
          : 0,
      proteinGrams: totals?.protein_grams ?? 0,
      carbsGrams: totals?.carbs_grams ?? 0,
      fatGrams: totals?.fat_grams ?? 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return summaries;
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

function getGoalTargetKg(mode: WeightGoalMode, profile?: UserProfile | null) {
  if (mode === 'maintain') {
    return null;
  }

  const plannedTargetKg = Math.abs(profile?.monthlyWeightGoalKg ?? 0);
  return plannedTargetKg > 0 ? plannedTargetKg : DEFAULT_TARGET_KG;
}

function buildGoalInsert(mode: WeightGoalMode, profile?: UserProfile | null): WeightGoalPreset {
  if (mode === 'maintain') {
    return {
      targetKg: null,
      targetKcalDelta: 0,
      targetDays: DEFAULT_MAINTAIN_DAYS,
    };
  }

  const targetKg = getGoalTargetKg(mode, profile) ?? DEFAULT_TARGET_KG;

  return {
    targetKg,
    targetKcalDelta: Math.round(targetKg * KCAL_PER_KG),
    targetDays: 0,
  };
}

function isSameGoalPreset(goal: WeightGoalRow, mode: WeightGoalMode, preset: WeightGoalPreset) {
  return (
    goal.mode === mode &&
    goal.target_kg === preset.targetKg &&
    goal.target_kcal_delta === preset.targetKcalDelta &&
    goal.target_days === preset.targetDays
  );
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
}

export async function startWeightGoal(mode: WeightGoalMode, profile?: UserProfile | null) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existingActiveGoal = await getActiveWeightGoalRow();
  const preset = buildGoalInsert(mode, profile);

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

export async function continueLatestCompletedGoal() {
  const database = await getDatabase();
  const latestCompletedGoal = await getLatestCompletedWeightGoalRow();

  if (!latestCompletedGoal) {
    return false;
  }

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

    await insertWeightGoal(
      database,
      latestCompletedGoal.mode,
      {
        targetKg: latestCompletedGoal.target_kg,
        targetKcalDelta: latestCompletedGoal.target_kcal_delta,
        targetDays: latestCompletedGoal.target_days,
      },
      now
    );
  });

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

  await startWeightGoal(getWeightGoalMode(profile.monthlyWeightGoalKg), profile);
}

export async function syncActiveGoalToProfile(profile: UserProfile) {
  const activeGoal = await getActiveWeightGoalRow();
  const recommendedMode = getWeightGoalMode(profile.monthlyWeightGoalKg);
  const preset = buildGoalInsert(recommendedMode, profile);

  if (!activeGoal) {
    await startWeightGoal(recommendedMode, profile);
    return;
  }

  if (isSameGoalPreset(activeGoal, recommendedMode, preset)) {
    return;
  }

  await startWeightGoal(recommendedMode, profile);
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
    const summaries = await listSummariesBetween(
      completedGoal.startedAt,
      completedGoal.completedAt ?? completedGoal.updatedAt
    );
    latestCompletedGoal = calculateGoalProgress(completedGoal, summaries, profile);
  }

  const historicalGoals = await listHistoricalWeightGoalRows();
  const goalHistory = await Promise.all(
    historicalGoals.map(async (goal) => {
      const summaries = await listSummariesBetween(
        goal.startedAt,
        goal.completedAt ?? goal.updatedAt
      );

      return calculateGoalProgress(goal, summaries, profile);
    })
  );

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

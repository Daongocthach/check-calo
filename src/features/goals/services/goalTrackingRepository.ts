import { getDatabase } from '@/services/database/sqlite';
import { nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import type {
  AchievementKey,
  AchievementUnlock,
  WeightGoal,
  WeightGoalMode,
  WeightGoalStatus,
} from '../types';
import { findSupersededActiveGoals } from '../utils/activeGoal';

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
  ended_at: string | null;
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

/** The planned numbers of a goal, set when it starts and edited when the plan changes. */
export interface WeightGoalPlan {
  targetKg: number | null;
  targetKcalDelta: number;
  targetDays: number;
  startWeightKg: number;
  targetWeightKg: number;
  monthlyRateKg: number;
}

const PLAN_COLUMNS: Record<keyof WeightGoalPlan, string> = {
  targetKg: 'target_kg',
  targetKcalDelta: 'target_kcal_delta',
  targetDays: 'target_days',
  startWeightKg: 'start_weight_kg',
  targetWeightKg: 'target_weight_kg',
  monthlyRateKg: 'monthly_rate_kg',
};

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
    endedAt: row.ended_at,
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

export async function getActiveWeightGoal() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status = 'active'
      ORDER BY started_at DESC
      LIMIT 1;
    `
  );

  return row ? mapWeightGoal(row) : null;
}

export async function getLatestCompletedWeightGoal() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status = 'completed'
      ORDER BY completed_at DESC, started_at DESC
      LIMIT 1;
    `
  );

  return row ? mapWeightGoal(row) : null;
}

export async function listHistoricalWeightGoals() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<WeightGoalRow>(
    `
      SELECT *
      FROM weight_goals
      WHERE status != 'active'
      ORDER BY
        COALESCE(ended_at, completed_at, updated_at) DESC,
        started_at DESC;
    `
  );

  return rows.map(mapWeightGoal);
}

/** Cancels the running goal, if any, and starts a new active one. */
export async function replaceActiveWeightGoal(
  mode: WeightGoalMode,
  plan: WeightGoalPlan,
  startedAt: string
) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE weight_goals
        SET status = 'cancelled', ended_at = ?, updated_at = ?, synced = 0
        WHERE status = 'active';
      `,
      [now, now]
    );

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
        plan.targetKg,
        plan.targetKcalDelta,
        plan.targetDays,
        plan.startWeightKg,
        plan.targetWeightKg,
        plan.monthlyRateKg,
        startedAt,
        now,
        now,
      ]
    );
  });
}

export async function updateWeightGoalPlan(goalId: string, changes: Partial<WeightGoalPlan>) {
  const entries = (Object.keys(changes) as (keyof WeightGoalPlan)[]).map(
    (key) => [PLAN_COLUMNS[key], changes[key] ?? null] as const
  );

  if (entries.length === 0) {
    return;
  }

  const database = await getDatabase();

  await database.runAsync(
    `
      UPDATE weight_goals
      SET ${entries.map(([column]) => `${column} = ?`).join(', ')}, updated_at = ?, synced = 0
      WHERE id = ?;
    `,
    [...entries.map(([, value]) => value), nowIsoString(), goalId]
  );
}

/** Marks a goal completed and returns its completion time. */
export async function completeWeightGoal(goalId: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE weight_goals
      SET status = 'completed', completed_at = ?, ended_at = ?, updated_at = ?, synced = 0
      WHERE id = ?;
    `,
    [now, now, now, goalId]
  );

  return now;
}

/** Goals saved or changed since the last push. */
export async function listPendingWeightGoals() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<WeightGoalRow>(
    'SELECT * FROM weight_goals WHERE synced = 0 ORDER BY started_at ASC;'
  );

  return rows.map(mapWeightGoal);
}

/** Marks pushed goals as synced unless they were changed again meanwhile. */
export async function markWeightGoalsSynced(goals: WeightGoal[]) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const goal of goals) {
      await database.runAsync(
        'UPDATE weight_goals SET synced = 1 WHERE id = ? AND updated_at = ?;',
        [goal.id, goal.updatedAt]
      );
    }
  });
}

/**
 * Saves goals pulled from the cloud and returns how many changed. A goal changed on this
 * device and not pushed yet wins; with `replace`, every local goal is dropped first. If that
 * leaves two running goals, only the most recently changed one keeps running.
 */
export async function applyCloudWeightGoals(
  goals: WeightGoal[],
  { replace = false }: { replace?: boolean } = {}
) {
  const database = await getDatabase();
  let changed = 0;

  await database.withTransactionAsync(async () => {
    if (replace) {
      await database.runAsync('DELETE FROM weight_goals;');
    }

    for (const goal of goals) {
      const result = await database.runAsync(
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
            ended_at,
            synced,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            mode = excluded.mode,
            target_kg = excluded.target_kg,
            target_kcal_delta = excluded.target_kcal_delta,
            target_days = excluded.target_days,
            start_weight_kg = excluded.start_weight_kg,
            target_weight_kg = excluded.target_weight_kg,
            monthly_rate_kg = excluded.monthly_rate_kg,
            status = excluded.status,
            started_at = excluded.started_at,
            completed_at = excluded.completed_at,
            ended_at = excluded.ended_at,
            synced = excluded.synced,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
          WHERE weight_goals.synced != 0 AND weight_goals.updated_at != excluded.updated_at;
        `,
        [
          goal.id,
          goal.mode,
          goal.targetKg,
          goal.targetKcalDelta,
          goal.targetDays,
          goal.startWeightKg,
          goal.targetWeightKg,
          goal.monthlyRateKg,
          goal.status,
          goal.startedAt,
          goal.completedAt,
          goal.endedAt,
          goal.createdAt,
          goal.updatedAt,
        ]
      );
      changed += result.changes;
    }

    const activeRows = await database.getAllAsync<WeightGoalRow>(
      "SELECT * FROM weight_goals WHERE status = 'active';"
    );
    const now = nowIsoString();

    for (const goal of findSupersededActiveGoals(activeRows.map(mapWeightGoal))) {
      await database.runAsync(
        `
          UPDATE weight_goals
          SET status = 'cancelled', ended_at = ?, updated_at = ?, synced = 0
          WHERE id = ?;
        `,
        [now, now, goal.id]
      );
      changed += 1;
    }
  });

  return changed;
}

export async function listAchievementUnlocks() {
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

export async function unlockAchievement(achievementKey: AchievementKey): Promise<boolean> {
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

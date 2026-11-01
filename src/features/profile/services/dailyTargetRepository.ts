import type { WeightGoalMode } from '@/features/goals/types';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import type { DailyTargetRecord, DayPlan } from '../types';

/**
 * How a saved plan relates to its cloud copy. A frozen plan is pushed only if the cloud has
 * none for that day, because another device may have frozen the day first.
 */
export const DAILY_TARGET_SYNC = {
  pending: 0,
  synced: 1,
  pendingIfMissing: 2,
} as const;

interface DailyTargetRow {
  date: string;
  calorie_target: number;
  protein_target_grams: number | null;
  carbs_target_grams: number | null;
  fat_target_grams: number | null;
  goal_mode: WeightGoalMode | null;
  source: DailyTargetRecord['source'];
  synced: number;
  created_at: string;
  updated_at: string;
}

export interface PendingDailyTarget extends DailyTargetRecord {
  /** False for a frozen plan, which must not replace a cloud copy. */
  overwrite: boolean;
}

function mapDailyTarget(row: DailyTargetRow): DailyTargetRecord {
  return {
    date: row.date,
    calorieTarget: row.calorie_target,
    proteinTargetGrams: row.protein_target_grams,
    carbsTargetGrams: row.carbs_target_grams,
    fatTargetGrams: row.fat_target_grams,
    goalMode: row.goal_mode,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Saved plans by date. */
export async function listDailyTargets(startDate: string, endDate: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DailyTargetRow>(
    `
      SELECT *
      FROM daily_calorie_targets
      WHERE date >= ? AND date <= ?;
    `,
    [formatDateKey(startDate), formatDateKey(endDate)]
  );

  return new Map(rows.map((row) => [row.date, mapDailyTarget(row)]));
}

/** Keeps the plan for days that have none yet, so a later goal change leaves them alone. */
export async function freezeDailyTargets(dates: string[], plan: DayPlan) {
  if (dates.length === 0) {
    return;
  }

  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    for (const date of dates) {
      await database.runAsync(
        `
          INSERT OR IGNORE INTO daily_calorie_targets (
            date,
            calorie_target,
            protein_target_grams,
            carbs_target_grams,
            fat_target_grams,
            source,
            goal_mode,
            synced,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, 'profile', ?, ?, ?, ?);
        `,
        [
          formatDateKey(date),
          plan.calorieTarget,
          plan.proteinTargetGrams,
          plan.carbsTargetGrams,
          plan.fatTargetGrams,
          plan.goalMode,
          DAILY_TARGET_SYNC.pendingIfMissing,
          now,
          now,
        ]
      );
    }
  });
}

/** Saves the plan for a day (today by default). A manual target for that day is kept. */
export async function recordDailyTarget(plan: DayPlan, date: string = formatDateKey(new Date())) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      INSERT INTO daily_calorie_targets (
        date,
        calorie_target,
        protein_target_grams,
        carbs_target_grams,
        fat_target_grams,
        source,
        goal_mode,
        synced,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'profile', ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        calorie_target = excluded.calorie_target,
        protein_target_grams = excluded.protein_target_grams,
        carbs_target_grams = excluded.carbs_target_grams,
        fat_target_grams = excluded.fat_target_grams,
        goal_mode = excluded.goal_mode,
        synced = excluded.synced,
        updated_at = excluded.updated_at
      WHERE daily_calorie_targets.source != 'manual';
    `,
    [
      formatDateKey(date),
      plan.calorieTarget,
      plan.proteinTargetGrams,
      plan.carbsTargetGrams,
      plan.fatTargetGrams,
      plan.goalMode,
      DAILY_TARGET_SYNC.pending,
      now,
      now,
    ]
  );
}

/** Plans saved or changed since the last push. */
export async function listPendingDailyTargets(): Promise<PendingDailyTarget[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DailyTargetRow>(
    'SELECT * FROM daily_calorie_targets WHERE synced != ? ORDER BY date ASC;',
    [DAILY_TARGET_SYNC.synced]
  );

  return rows.map((row) => ({
    ...mapDailyTarget(row),
    overwrite: row.synced === DAILY_TARGET_SYNC.pending,
  }));
}

/** Marks pushed plans as synced unless they were changed again meanwhile. */
export async function markDailyTargetsSynced(targets: DailyTargetRecord[]) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const target of targets) {
      await database.runAsync(
        'UPDATE daily_calorie_targets SET synced = ? WHERE date = ? AND updated_at = ?;',
        [DAILY_TARGET_SYNC.synced, target.date, target.updatedAt]
      );
    }
  });
}

/**
 * Saves plans pulled from the cloud and returns how many changed. A plan changed on this
 * device and not pushed yet wins; with `replace`, every local plan is dropped first.
 */
export async function applyCloudDailyTargets(
  targets: DailyTargetRecord[],
  { replace = false }: { replace?: boolean } = {}
) {
  const database = await getDatabase();
  let changed = 0;

  await database.withTransactionAsync(async () => {
    if (replace) {
      await database.runAsync('DELETE FROM daily_calorie_targets;');
    }

    for (const target of targets) {
      const result = await database.runAsync(
        `
          INSERT INTO daily_calorie_targets (
            date,
            calorie_target,
            protein_target_grams,
            carbs_target_grams,
            fat_target_grams,
            source,
            goal_mode,
            synced,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            calorie_target = excluded.calorie_target,
            protein_target_grams = excluded.protein_target_grams,
            carbs_target_grams = excluded.carbs_target_grams,
            fat_target_grams = excluded.fat_target_grams,
            source = excluded.source,
            goal_mode = excluded.goal_mode,
            synced = excluded.synced,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
          WHERE daily_calorie_targets.synced != ?
            AND daily_calorie_targets.updated_at != excluded.updated_at;
        `,
        [
          target.date,
          target.calorieTarget,
          target.proteinTargetGrams,
          target.carbsTargetGrams,
          target.fatTargetGrams,
          target.source,
          target.goalMode,
          DAILY_TARGET_SYNC.synced,
          target.createdAt,
          target.updatedAt,
          DAILY_TARGET_SYNC.pending,
        ]
      );
      changed += result.changes;
    }
  });

  return changed;
}

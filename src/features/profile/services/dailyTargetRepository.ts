import type { WeightGoalMode } from '@/features/goals/types';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import type { DayPlan } from '../types';

interface DailyTargetRow {
  date: string;
  calorie_target: number;
  goal_mode: WeightGoalMode | null;
}

/** Saved plans by date. A manual target saved without a goal has a null mode. */
export async function listDailyTargets(startDate: string, endDate: string) {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DailyTargetRow>(
    `
      SELECT date, calorie_target, goal_mode
      FROM daily_calorie_targets
      WHERE date >= ? AND date <= ?;
    `,
    [formatDateKey(startDate), formatDateKey(endDate)]
  );

  return new Map(
    rows.map((row) => [row.date, { calorieTarget: row.calorie_target, goalMode: row.goal_mode }])
  );
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
          INSERT OR IGNORE INTO daily_calorie_targets
            (date, calorie_target, source, goal_mode, created_at, updated_at)
          VALUES (?, ?, 'profile', ?, ?, ?);
        `,
        [formatDateKey(date), plan.calorieTarget, plan.goalMode, now, now]
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
      INSERT INTO daily_calorie_targets
        (date, calorie_target, source, goal_mode, created_at, updated_at)
      VALUES (?, ?, 'profile', ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        calorie_target = excluded.calorie_target,
        goal_mode = excluded.goal_mode,
        updated_at = excluded.updated_at
      WHERE daily_calorie_targets.source != 'manual';
    `,
    [formatDateKey(date), plan.calorieTarget, plan.goalMode, now, now]
  );
}

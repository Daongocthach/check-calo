import {
  freezeDailyTargets,
  listDailyTargets,
} from '@/features/profile/services/dailyTargetRepository';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import type { DailyTargetRecord } from '@/features/profile/types';
import { getDailyCalorieGoalState, getProfileDayPlan } from '@/features/profile/utils/calorie';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey } from '@/utils/date';
import type { DailyNutritionSummary, NutritionTrendPoint } from '../types';
import { NUTRIENT_SQL, nutrientsFromColumns, type NutrientColumnValues } from '../utils/nutrients';

type SavedDayPlan = Pick<
  DailyTargetRecord,
  'calorieTarget' | 'goalMode' | 'proteinTargetGrams' | 'carbsTargetGrams' | 'fatTargetGrams'
>;

interface DailyTotalsRow extends NutrientColumnValues {
  entry_date: string;
  consumed_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
}

export async function getDailyNutritionSummary(
  date: string | Date
): Promise<DailyNutritionSummary> {
  const [summary] = await listDailyNutritionSummaries(date, date);
  return summary;
}

/**
 * Totals per day with the plan each day is judged by. A logged day without a saved plan
 * keeps the current one from now on, so later goal changes do not re-judge it.
 */
export async function listDailyNutritionSummaries(
  startDate: string | Date,
  endDate: string | Date
): Promise<NutritionTrendPoint[]> {
  const database = await getDatabase();
  const normalizedStartDate = formatDateKey(startDate);
  const normalizedEndDate = formatDateKey(endDate);
  const profile = await getUserProfile();
  const profilePlan = profile ? getProfileDayPlan(profile) : null;
  const plans: Map<string, SavedDayPlan> = await listDailyTargets(
    normalizedStartDate,
    normalizedEndDate
  );
  const totalRows = await database.getAllAsync<DailyTotalsRow>(
    `
      SELECT
        entry_date,
        COALESCE(SUM(total_calories), 0) AS consumed_calories,
        COALESCE(SUM(protein_grams), 0) AS protein_grams,
        COALESCE(SUM(carbs_grams), 0) AS carbs_grams,
        COALESCE(SUM(fat_grams), 0) AS fat_grams,
        ${NUTRIENT_SQL.sums}
      FROM food_entries
      WHERE entry_date >= ? AND entry_date <= ?
      GROUP BY entry_date
      ORDER BY entry_date ASC;
    `,
    [normalizedStartDate, normalizedEndDate]
  );

  const unplannedDates = totalRows
    .filter((row) => (row.consumed_calories ?? 0) > 0 && !plans.has(row.entry_date))
    .map((row) => row.entry_date);

  if (profilePlan && unplannedDates.length > 0) {
    await freezeDailyTargets(unplannedDates, profilePlan);
    unplannedDates.forEach((date) => plans.set(date, profilePlan));
  }

  const totalsMap = new Map(totalRows.map((row) => [row.entry_date, row]));
  const points: NutritionTrendPoint[] = [];
  const cursor = new Date(`${normalizedStartDate}T00:00:00`);
  const finalDate = new Date(`${normalizedEndDate}T00:00:00`);

  while (cursor <= finalDate) {
    const dateKey = formatDateKey(cursor);
    const totals = totalsMap.get(dateKey);
    const plan = plans.get(dateKey);
    const calorieTarget = plan?.calorieTarget ?? profilePlan?.calorieTarget ?? 0;
    const consumedCalories = totals?.consumed_calories ?? 0;

    points.push({
      date: dateKey,
      label: dateKey,
      calorieTarget,
      goalMode: plan?.goalMode ?? profilePlan?.goalMode ?? 'maintain',
      consumedCalories,
      remainingCalories: calorieTarget - consumedCalories,
      progressPercent:
        calorieTarget > 0 ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100)) : 0,
      proteinGrams: totals?.protein_grams ?? 0,
      carbsGrams: totals?.carbs_grams ?? 0,
      fatGrams: totals?.fat_grams ?? 0,
      proteinTargetGrams: plan?.proteinTargetGrams ?? profilePlan?.proteinTargetGrams ?? 0,
      carbsTargetGrams: plan?.carbsTargetGrams ?? profilePlan?.carbsTargetGrams ?? 0,
      fatTargetGrams: plan?.fatTargetGrams ?? profilePlan?.fatTargetGrams ?? 0,
      nutrients: nutrientsFromColumns(totals ?? {}),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

export async function listLoggedDailyStatuses(
  startDate: string | Date,
  endDate: string | Date
): Promise<Array<{ date: string; status: 'success' | 'failed' }>> {
  const summaries = await listDailyNutritionSummaries(startDate, endDate);
  const profile = await getUserProfile();

  return summaries.flatMap((summary) => {
    const hasLoggedCalories = summary.consumedCalories > 0;

    if (!hasLoggedCalories || summary.calorieTarget <= 0) {
      return [];
    }

    return [
      {
        date: summary.date,
        status:
          getDailyCalorieGoalState(
            profile,
            summary.calorieTarget,
            summary.consumedCalories,
            summary.date,
            summary.goalMode
          ) === 'on_target'
            ? 'success'
            : 'failed',
      },
    ];
  });
}

/** Earliest diary date (YYYY-MM-DD), or null when nothing has been logged. */
export async function getFirstEntryDate() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ entry_date: string | null }>(
    'SELECT MIN(entry_date) AS entry_date FROM food_entries;'
  );

  return row?.entry_date ?? null;
}

/** Total number of diary entries. */
export async function countFoodEntries() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number | null }>(
    'SELECT COUNT(*) AS count FROM food_entries;'
  );

  return row?.count ?? 0;
}

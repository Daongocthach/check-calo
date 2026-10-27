import { getUserProfile } from '@/features/profile/services/profileRepository';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey } from '@/utils/date';
import type { DailyNutritionSummary, NutritionTrendPoint } from '../types';
import { NUTRIENT_SQL, nutrientsFromColumns, type NutrientColumnValues } from '../utils/nutrients';

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
  const database = await getDatabase();
  const normalizedDate = formatDateKey(date);
  const profile = await getUserProfile();
  const override = await database.getFirstAsync<{ calorie_target: number }>(
    'SELECT calorie_target FROM daily_calorie_targets WHERE date = ? LIMIT 1;',
    [normalizedDate]
  );
  const totals = await database.getFirstAsync<Omit<DailyTotalsRow, 'entry_date'>>(
    `
      SELECT
        COALESCE(SUM(total_calories), 0) AS consumed_calories,
        COALESCE(SUM(protein_grams), 0) AS protein_grams,
        COALESCE(SUM(carbs_grams), 0) AS carbs_grams,
        COALESCE(SUM(fat_grams), 0) AS fat_grams,
        ${NUTRIENT_SQL.sums}
      FROM food_entries
      WHERE entry_date = ?;
    `,
    [normalizedDate]
  );

  const calorieTarget = override?.calorie_target ?? profile?.dailyCalorieTarget ?? 0;
  const consumedCalories = totals?.consumed_calories ?? 0;
  const proteinGrams = totals?.protein_grams ?? 0;
  const carbsGrams = totals?.carbs_grams ?? 0;
  const fatGrams = totals?.fat_grams ?? 0;

  return {
    date: normalizedDate,
    calorieTarget,
    consumedCalories,
    remainingCalories: calorieTarget - consumedCalories,
    progressPercent:
      calorieTarget > 0 ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100)) : 0,
    proteinGrams,
    carbsGrams,
    fatGrams,
    nutrients: nutrientsFromColumns(totals ?? {}),
  };
}

export async function listDailyNutritionSummaries(
  startDate: string | Date,
  endDate: string | Date
): Promise<NutritionTrendPoint[]> {
  const database = await getDatabase();
  const normalizedStartDate = formatDateKey(startDate);
  const normalizedEndDate = formatDateKey(endDate);
  const profile = await getUserProfile();
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

  const overrideMap = new Map(overrideRows.map((row) => [row.date, row.calorie_target]));
  const totalsMap = new Map(totalRows.map((row) => [row.entry_date, row]));

  const points: NutritionTrendPoint[] = [];
  const cursor = new Date(`${normalizedStartDate}T00:00:00`);
  const finalDate = new Date(`${normalizedEndDate}T00:00:00`);

  while (cursor <= finalDate) {
    const dateKey = formatDateKey(cursor);
    const totals = totalsMap.get(dateKey);
    const calorieTarget = overrideMap.get(dateKey) ?? profile?.dailyCalorieTarget ?? 0;
    const consumedCalories = totals?.consumed_calories ?? 0;
    const proteinGrams = totals?.protein_grams ?? 0;
    const carbsGrams = totals?.carbs_grams ?? 0;
    const fatGrams = totals?.fat_grams ?? 0;

    points.push({
      date: dateKey,
      label: dateKey,
      calorieTarget,
      consumedCalories,
      remainingCalories: calorieTarget - consumedCalories,
      progressPercent:
        calorieTarget > 0 ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100)) : 0,
      proteinGrams,
      carbsGrams,
      fatGrams,
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
          getDailyCalorieGoalState(profile, summary.calorieTarget, summary.consumedCalories) ===
          'on_target'
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

import { getDatabase } from '@/services/database/sqlite';
import type {
  DailyNutritionSummary,
  DailyTargetOverride,
  RecentFood,
  FoodEntryInput,
  NutritionTrendPoint,
  UserProfile,
  UserProfileInput,
} from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  calculateMaintenanceCalorieTarget,
  createEntityId,
  formatDateKey,
  getActivityFactor,
  getDailyCalorieGoalState,
  nowIsoString,
} from '../utils/calorie';
import { deleteFoodEntryFromCloud, syncFoodEntryToCloud } from './foodEntrySync';
import {
  countImageAssetReferences,
  getFoodEntryById,
  mapFoodEntry,
  mapRecentFood,
  replaceImageUriReferences,
  replaceThumbnailUriReferences,
} from './nutritionDatabaseCore';
import type { FoodEntryRow, RecentFoodRow } from './nutritionDatabaseCore';
import type { PageRequest, PaginatedResult } from './pagination';
import { deleteRecentFoodFromCloud, syncRecentFoodToCloud } from './recentFoodSync';

export {
  countImageAssetReferences,
  getFoodEntryById,
  mapFoodEntry,
  mapRecentFood,
  replaceImageUriReferences,
  replaceThumbnailUriReferences,
};

interface UserProfileRow {
  id: number;
  display_name: string;
  gender: UserProfile['gender'];
  age: number;
  height_cm: number;
  weight_kg: number;
  monthly_weight_loss_kg: number;
  activity_level: UserProfile['activityLevel'];
  activity_factor: number;
  bmi: number;
  maintenance_calorie_target: number;
  daily_calorie_target: number;
  protein_target_grams: number;
  carbs_target_grams: number;
  fat_target_grams: number;
  created_at: string;
  updated_at: string;
}

interface DailyTotalsRow {
  entry_date: string;
  consumed_calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    gender: row.gender,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    monthlyWeightGoalKg: row.monthly_weight_loss_kg,
    activityLevel: row.activity_level,
    activityFactor: row.activity_factor,
    bmi: row.bmi,
    maintenanceCalorieTarget: row.maintenance_calorie_target,
    dailyCalorieTarget: row.daily_calorie_target,
    proteinTargetGrams: row.protein_target_grams,
    carbsTargetGrams: row.carbs_target_grams,
    fatTargetGrams: row.fat_target_grams,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePage(page?: number) {
  return Math.max(1, Math.floor(page ?? 1));
}

function normalizePageSize(pageSize?: number) {
  return Math.max(1, Math.floor(pageSize ?? 20));
}

function startOfDayIso(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function endOfDayIso(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

interface RecentFoodPageRequest extends PageRequest {
  searchQuery?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

function buildRecentFoodsWhereClause(request: RecentFoodPageRequest) {
  const conditions: string[] = [];
  const params: Array<string> = [];
  const normalizedSearch = request.searchQuery?.trim().toLowerCase();

  if (request.startDate) {
    conditions.push('created_at >= ?');
    params.push(startOfDayIso(request.startDate));
  }

  if (request.endDate) {
    conditions.push('created_at <= ?');
    params.push(endOfDayIso(request.endDate));
  }

  if (normalizedSearch) {
    conditions.push("(LOWER(name) LIKE ? OR LOWER(COALESCE(notes, '')) LIKE ?)");
    const query = `%${normalizedSearch}%`;
    params.push(query, query);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export async function getUserProfile() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<UserProfileRow>(
    'SELECT * FROM user_profile WHERE id = 1 LIMIT 1;'
  );

  return row ? mapProfile(row) : null;
}

export async function upsertUserProfile(profile: UserProfileInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const bmi = Number(calculateBmi(profile.heightCm, profile.weightKg).toFixed(1));
  const maintenanceCalorieTarget = calculateMaintenanceCalorieTarget(profile);
  const dailyCalorieTarget = calculateDailyCalorieTarget(profile);
  const activityFactor = getActivityFactor(profile.activityLevel);
  const { proteinTargetGrams, carbsTargetGrams, fatTargetGrams } = calculateMacroTargets(profile);

  await database.runAsync(
    `
      INSERT INTO user_profile (
        id,
        display_name,
        gender,
        age,
        height_cm,
        weight_kg,
        monthly_weight_loss_kg,
        activity_level,
        activity_factor,
        bmi,
        maintenance_calorie_target,
        daily_calorie_target,
        protein_target_grams,
        carbs_target_grams,
        fat_target_grams,
        created_at,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        gender = excluded.gender,
        age = excluded.age,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        monthly_weight_loss_kg = excluded.monthly_weight_loss_kg,
        activity_level = excluded.activity_level,
        activity_factor = excluded.activity_factor,
        bmi = excluded.bmi,
        maintenance_calorie_target = excluded.maintenance_calorie_target,
        daily_calorie_target = excluded.daily_calorie_target,
        protein_target_grams = excluded.protein_target_grams,
        carbs_target_grams = excluded.carbs_target_grams,
        fat_target_grams = excluded.fat_target_grams,
        updated_at = excluded.updated_at;
    `,
    [
      profile.displayName,
      profile.gender,
      profile.age,
      profile.heightCm,
      profile.weightKg,
      profile.monthlyWeightGoalKg,
      profile.activityLevel,
      activityFactor,
      bmi,
      maintenanceCalorieTarget,
      dailyCalorieTarget,
      proteinTargetGrams,
      carbsTargetGrams,
      fatTargetGrams,
      now,
      now,
    ]
  );

  return getUserProfile();
}

export async function deleteUserProfile() {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM daily_calorie_targets;');
    await database.runAsync('DELETE FROM user_profile WHERE id = 1;');
  });
}

export async function resetNutritionData() {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM recent_foods;');
    await database.runAsync('DELETE FROM food_entries;');
    await database.runAsync('DELETE FROM daily_calorie_targets;');
    await database.runAsync('DELETE FROM user_profile;');
  });
}

export async function upsertDailyTargetOverride(date: string, calorieTarget: number) {
  const database = await getDatabase();
  const now = nowIsoString();
  const normalizedDate = formatDateKey(date);

  await database.runAsync(
    `
      INSERT INTO daily_calorie_targets (date, calorie_target, source, created_at, updated_at)
      VALUES (?, ?, 'manual', ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        calorie_target = excluded.calorie_target,
        source = excluded.source,
        updated_at = excluded.updated_at;
    `,
    [normalizedDate, calorieTarget, now, now]
  );

  return {
    date: normalizedDate,
    calorieTarget,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  } satisfies DailyTargetOverride;
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
  const totals = await database.getFirstAsync<{
    consumed_calories: number | null;
    protein_grams: number | null;
    carbs_grams: number | null;
    fat_grams: number | null;
  }>(
    `
      SELECT
        COALESCE(SUM(total_calories), 0) AS consumed_calories,
        COALESCE(SUM(protein_grams), 0) AS protein_grams,
        COALESCE(SUM(carbs_grams), 0) AS carbs_grams,
        COALESCE(SUM(fat_grams), 0) AS fat_grams
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

export async function listFoodEntriesByDate(date: string | Date) {
  const database = await getDatabase();
  const normalizedDate = formatDateKey(date);
  const rows = await database.getAllAsync<FoodEntryRow>(
    `
      SELECT
        food_entries.*,
        CASE WHEN recent_foods.id IS NOT NULL THEN 1 ELSE 0 END AS is_recent
      FROM food_entries
      LEFT JOIN recent_foods ON recent_foods.source_entry_id = food_entries.id
      WHERE food_entries.entry_date = ?
      ORDER BY food_entries.consumed_at DESC;
    `,
    [normalizedDate]
  );

  return rows.map(mapFoodEntry);
}

export async function createFoodEntry(input: FoodEntryInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const consumedAt = input.consumedAt ?? now;
  const entryDate = formatDateKey(input.entryDate ?? consumedAt);
  const id = createEntityId('entry');

  await database.runAsync(
    `
      INSERT INTO food_entries (
        id,
        entry_date,
        consumed_at,
        barcode,
        meal_name,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      entryDate,
      consumedAt,
      input.barcode ?? null,
      input.mealName,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? null,
      now,
      now,
    ]
  );

  const createdEntry = await getFoodEntryById(id);

  if (createdEntry) {
    void syncFoodEntryToCloud(createdEntry.id);
  }

  if (!createdEntry) {
    throw new Error('Failed to create food entry');
  }

  return createdEntry;
}

export async function updateFoodEntry(entryId: string, input: FoodEntryInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existingEntry = await getFoodEntryById(entryId);

  if (!existingEntry) {
    throw new Error('Food entry not found');
  }

  const consumedAt = input.consumedAt ?? existingEntry.consumedAt;
  const entryDate = formatDateKey(input.entryDate ?? existingEntry.entryDate);

  await database.runAsync(
    `
      UPDATE food_entries
      SET
        entry_date = ?,
        consumed_at = ?,
        barcode = ?,
        meal_name = ?,
        quantity_label = ?,
        quantity_grams = ?,
        total_calories = ?,
        protein_grams = ?,
        carbs_grams = ?,
        fat_grams = ?,
        notes = ?,
        image_uri = ?,
        thumbnail_uri = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    [
      entryDate,
      consumedAt,
      input.barcode ?? existingEntry.barcode ?? null,
      input.mealName,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? null,
      now,
      entryId,
    ]
  );

  void syncFoodEntryToCloud(entryId);

  return getFoodEntryById(entryId);
}

export async function deleteFoodEntry(entryId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM food_entries WHERE id = ?;', [entryId]);
  void deleteFoodEntryFromCloud(entryId);
}

export async function listRecentFoodsPage(
  request: RecentFoodPageRequest = {}
): Promise<PaginatedResult<RecentFood>> {
  const database = await getDatabase();
  const page = normalizePage(request.page);
  const pageSize = normalizePageSize(request.pageSize);
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildRecentFoodsWhereClause(request);
  const rows = await database.getAllAsync<RecentFoodRow>(
    `
      SELECT *
      FROM recent_foods
      ${whereClause}
      ORDER BY updated_at DESC, created_at DESC, id DESC
      LIMIT ? OFFSET ?;
    `,
    [...params, pageSize + 1, offset]
  );

  const hasNextPage = rows.length > pageSize;
  const pagedRows = hasNextPage ? rows.slice(0, pageSize) : rows;

  return {
    items: pagedRows.map(mapRecentFood),
    page,
    pageSize,
    hasNextPage,
  };
}

export async function countRecentFoods(request: RecentFoodPageRequest = {}) {
  const database = await getDatabase();
  const { whereClause, params } = buildRecentFoodsWhereClause(request);
  const row = await database.getFirstAsync<{ count: number | null }>(
    `
      SELECT COUNT(*) AS count
      FROM recent_foods
      ${whereClause};
    `,
    params
  );

  return row?.count ?? 0;
}

export async function getRecentFoodsStartDate(request: RecentFoodPageRequest = {}) {
  const database = await getDatabase();
  const { whereClause, params } = buildRecentFoodsWhereClause(request);
  const row = await database.getFirstAsync<{ created_at: string | null }>(
    `
      SELECT MIN(created_at) AS created_at
      FROM recent_foods
      ${whereClause};
    `,
    params
  );

  return row?.created_at ?? null;
}

export async function listRecentFoods() {
  const result = await listRecentFoodsPage();
  return result.items;
}

export async function getRecentFoodById(recentId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<RecentFoodRow>(
    'SELECT * FROM recent_foods WHERE id = ? LIMIT 1;',
    [recentId]
  );

  return row ? mapRecentFood(row) : null;
}

export async function toggleRecentFoodEntry(entryId: string) {
  const database = await getDatabase();
  const existingRecent = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM recent_foods WHERE source_entry_id = ? LIMIT 1;',
    [entryId]
  );

  if (existingRecent) {
    await database.runAsync('DELETE FROM recent_foods WHERE id = ?;', [existingRecent.id]);
    void deleteRecentFoodFromCloud(existingRecent.id);
    return false;
  }

  const entry = await getFoodEntryById(entryId);

  if (!entry) {
    throw new Error('Food entry not found');
  }

  const now = nowIsoString();

  const id = createEntityId('recent');

  await database.runAsync(
    `
      INSERT INTO recent_foods (
        id,
        source_entry_id,
        barcode,
        name,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      entry.id,
      entry.barcode ?? null,
      entry.mealName,
      entry.quantityLabel,
      entry.quantityGrams ?? null,
      entry.totalCalories,
      entry.proteinGrams,
      entry.carbsGrams,
      entry.fatGrams,
      entry.notes ?? null,
      entry.imageUri ?? null,
      entry.thumbnailUri ?? entry.imageUri ?? null,
      now,
      now,
    ]
  );

  void syncRecentFoodToCloud(id);

  return true;
}

export async function deleteRecentFood(recentId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM recent_foods WHERE id = ?;', [recentId]);
  void deleteRecentFoodFromCloud(recentId);
}

export async function updateRecentFood(
  recentId: string,
  input: Pick<
    RecentFood,
    | 'name'
    | 'barcode'
    | 'quantityLabel'
    | 'quantityGrams'
    | 'totalCalories'
    | 'proteinGrams'
    | 'carbsGrams'
    | 'fatGrams'
    | 'notes'
    | 'imageUri'
    | 'thumbnailUri'
  >
) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE recent_foods
      SET
        name = ?,
        barcode = ?,
        quantity_label = ?,
        quantity_grams = ?,
        total_calories = ?,
        protein_grams = ?,
        carbs_grams = ?,
        fat_grams = ?,
        notes = ?,
        image_uri = ?,
        thumbnail_uri = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    [
      input.name,
      input.barcode ?? null,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? input.imageUri ?? null,
      now,
      recentId,
    ]
  );

  void syncRecentFoodToCloud(recentId);

  return getRecentFoodById(recentId);
}

export async function upsertRecentFoodFromInput(
  input: Pick<
    RecentFood,
    | 'name'
    | 'barcode'
    | 'quantityLabel'
    | 'quantityGrams'
    | 'totalCalories'
    | 'proteinGrams'
    | 'carbsGrams'
    | 'fatGrams'
    | 'notes'
    | 'imageUri'
    | 'thumbnailUri'
  >
) {
  const database = await getDatabase();
  const existingRecent = await database.getFirstAsync<{ id: string }>(
    input.barcode
      ? 'SELECT id FROM recent_foods WHERE barcode = ? LIMIT 1;'
      : 'SELECT id FROM recent_foods WHERE name = ? COLLATE NOCASE LIMIT 1;',
    [input.barcode ?? input.name]
  );

  if (existingRecent) {
    return updateRecentFood(existingRecent.id, input);
  }

  const now = nowIsoString();
  const recentId = createEntityId('recent');

  await database.runAsync(
    `
      INSERT INTO recent_foods (
        id,
        source_entry_id,
        barcode,
        name,
        quantity_label,
        quantity_grams,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      recentId,
      input.barcode ?? null,
      input.name,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? null,
      input.thumbnailUri ?? input.imageUri ?? null,
      now,
      now,
    ]
  );

  void syncRecentFoodToCloud(recentId);

  return getRecentFoodById(recentId);
}

export async function createFoodEntryFromRecent(
  recentId: string,
  overrides?: Partial<
    Pick<FoodEntryInput, 'quantityLabel' | 'quantityGrams' | 'notes' | 'consumedAt' | 'entryDate'>
  >
) {
  const recent = await getRecentFoodById(recentId);

  if (!recent) {
    throw new Error('Recent food not found');
  }

  return createFoodEntry({
    mealName: recent.name,
    barcode: recent.barcode,
    quantityLabel: overrides?.quantityLabel ?? recent.quantityLabel,
    quantityGrams: overrides?.quantityGrams ?? recent.quantityGrams,
    totalCalories: recent.totalCalories,
    proteinGrams: recent.proteinGrams,
    carbsGrams: recent.carbsGrams,
    fatGrams: recent.fatGrams,
    notes: overrides?.notes ?? recent.notes,
    imageUri: recent.imageUri,
    thumbnailUri: recent.thumbnailUri,
    consumedAt: overrides?.consumedAt,
    entryDate: overrides?.entryDate,
  });
}

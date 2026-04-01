import { getDatabase } from '@/services/database/sqlite';
import type {
  DailyNutritionSummary,
  DailyTargetOverride,
  FavoriteFood,
  FoodEntry,
  FoodEntryInput,
  NutritionTrendPoint,
  UserProfile,
  UserProfileInput,
} from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  createEntityId,
  formatDateKey,
  nowIsoString,
  getActivityFactor,
} from '../utils/calorie';

interface UserProfileRow {
  id: number;
  gender: UserProfile['gender'];
  age: number;
  height_cm: number;
  weight_kg: number;
  activity_level: UserProfile['activityLevel'];
  activity_factor: number;
  bmi: number;
  daily_calorie_target: number;
  created_at: string;
  updated_at: string;
}

interface FoodEntryRow {
  id: string;
  entry_date: string;
  consumed_at: string;
  meal_name: string;
  quantity_label: string;
  quantity_grams: number | null;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
  created_at: string;
  updated_at: string;
  is_favorite: number;
}

interface FavoriteFoodRow {
  id: string;
  source_entry_id: string | null;
  name: string;
  quantity_label: string;
  quantity_grams: number | null;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
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
    gender: row.gender,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activityLevel: row.activity_level,
    activityFactor: row.activity_factor,
    bmi: row.bmi,
    dailyCalorieTarget: row.daily_calorie_target,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFoodEntry(row: FoodEntryRow): FoodEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    consumedAt: row.consumed_at,
    mealName: row.meal_name,
    quantityLabel: row.quantity_label,
    quantityGrams: row.quantity_grams,
    totalCalories: row.total_calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
    notes: row.notes,
    imageUri: row.image_uri,
    thumbnailUri: row.thumbnail_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isFavorite: row.is_favorite === 1,
  };
}

function mapFavoriteFood(row: FavoriteFoodRow): FavoriteFood {
  return {
    id: row.id,
    sourceEntryId: row.source_entry_id,
    name: row.name,
    quantityLabel: row.quantity_label,
    quantityGrams: row.quantity_grams,
    totalCalories: row.total_calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
    notes: row.notes,
    imageUri: row.image_uri,
    thumbnailUri: row.thumbnail_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  const dailyCalorieTarget = calculateDailyCalorieTarget(profile);
  const activityFactor = getActivityFactor(profile.activityLevel);

  await database.runAsync(
    `
      INSERT INTO user_profile (
        id,
        gender,
        age,
        height_cm,
        weight_kg,
        activity_level,
        activity_factor,
        bmi,
        daily_calorie_target,
        created_at,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        gender = excluded.gender,
        age = excluded.age,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        activity_level = excluded.activity_level,
        activity_factor = excluded.activity_factor,
        bmi = excluded.bmi,
        daily_calorie_target = excluded.daily_calorie_target,
        updated_at = excluded.updated_at;
    `,
    [
      profile.gender,
      profile.age,
      profile.heightCm,
      profile.weightKg,
      profile.activityLevel,
      activityFactor,
      bmi,
      dailyCalorieTarget,
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
    await database.runAsync('DELETE FROM favorite_foods;');
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

export async function listFoodEntriesByDate(date: string | Date) {
  const database = await getDatabase();
  const normalizedDate = formatDateKey(date);
  const rows = await database.getAllAsync<FoodEntryRow>(
    `
      SELECT
        food_entries.*,
        CASE WHEN favorite_foods.id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
      FROM food_entries
      LEFT JOIN favorite_foods ON favorite_foods.source_entry_id = food_entries.id
      WHERE food_entries.entry_date = ?
      ORDER BY food_entries.consumed_at DESC;
    `,
    [normalizedDate]
  );

  return rows.map(mapFoodEntry);
}

export async function getFoodEntryById(entryId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<FoodEntryRow>(
    `
      SELECT
        food_entries.*,
        CASE WHEN favorite_foods.id IS NOT NULL THEN 1 ELSE 0 END AS is_favorite
      FROM food_entries
      LEFT JOIN favorite_foods ON favorite_foods.source_entry_id = food_entries.id
      WHERE food_entries.id = ?
      LIMIT 1;
    `,
    [entryId]
  );

  return row ? mapFoodEntry(row) : null;
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      entryDate,
      consumedAt,
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

  if (!createdEntry) {
    throw new Error('Failed to create food entry');
  }

  return createdEntry;
}

export async function updateFoodEntry(entryId: string, input: FoodEntryInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const consumedAt = input.consumedAt ?? now;
  const entryDate = formatDateKey(input.entryDate ?? consumedAt);

  await database.runAsync(
    `
      UPDATE food_entries
      SET
        entry_date = ?,
        consumed_at = ?,
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

  return getFoodEntryById(entryId);
}

export async function replaceImageUriReferences(previousUri: string, nextUri: string | null) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE food_entries
        SET image_uri = ?, updated_at = ?
        WHERE image_uri = ?;
      `,
      [nextUri, now, previousUri]
    );

    await database.runAsync(
      `
        UPDATE favorite_foods
        SET image_uri = ?, updated_at = ?
        WHERE image_uri = ?;
      `,
      [nextUri, now, previousUri]
    );
  });
}

export async function replaceThumbnailUriReferences(previousUri: string, nextUri: string | null) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE food_entries
        SET thumbnail_uri = ?, updated_at = ?
        WHERE thumbnail_uri = ?;
      `,
      [nextUri, now, previousUri]
    );

    await database.runAsync(
      `
        UPDATE favorite_foods
        SET thumbnail_uri = ?, updated_at = ?
        WHERE thumbnail_uri = ?;
      `,
      [nextUri, now, previousUri]
    );
  });
}

export async function countImageAssetReferences(uri: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ reference_count: number | null }>(
    `
      SELECT (
        SELECT COUNT(*) FROM food_entries WHERE image_uri = ? OR thumbnail_uri = ?
      ) + (
        SELECT COUNT(*) FROM favorite_foods WHERE image_uri = ? OR thumbnail_uri = ?
      ) AS reference_count;
    `,
    [uri, uri, uri, uri]
  );

  return row?.reference_count ?? 0;
}

export async function deleteFoodEntry(entryId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM food_entries WHERE id = ?;', [entryId]);
}

export async function listFavoriteFoods() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<FavoriteFoodRow>(
    'SELECT * FROM favorite_foods ORDER BY created_at DESC;'
  );

  return rows.map(mapFavoriteFood);
}

export async function getFavoriteFoodById(favoriteId: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<FavoriteFoodRow>(
    'SELECT * FROM favorite_foods WHERE id = ? LIMIT 1;',
    [favoriteId]
  );

  return row ? mapFavoriteFood(row) : null;
}

export async function toggleFavoriteFoodEntry(entryId: string) {
  const database = await getDatabase();
  const existingFavorite = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM favorite_foods WHERE source_entry_id = ? LIMIT 1;',
    [entryId]
  );

  if (existingFavorite) {
    await database.runAsync('DELETE FROM favorite_foods WHERE id = ?;', [existingFavorite.id]);
    return false;
  }

  const entry = await getFoodEntryById(entryId);

  if (!entry) {
    throw new Error('Food entry not found');
  }

  const now = nowIsoString();

  await database.runAsync(
    `
      INSERT INTO favorite_foods (
        id,
        source_entry_id,
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      createEntityId('favorite'),
      entry.id,
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

  return true;
}

export async function deleteFavoriteFood(favoriteId: string) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM favorite_foods WHERE id = ?;', [favoriteId]);
}

export async function updateFavoriteFood(
  favoriteId: string,
  input: Pick<
    FavoriteFood,
    | 'name'
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
      UPDATE favorite_foods
      SET
        name = ?,
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
      favoriteId,
    ]
  );

  return getFavoriteFoodById(favoriteId);
}

export async function upsertFavoriteFoodFromInput(
  input: Pick<
    FavoriteFood,
    | 'name'
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
  const existingFavorite = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM favorite_foods WHERE name = ? COLLATE NOCASE LIMIT 1;',
    [input.name]
  );

  if (existingFavorite) {
    return updateFavoriteFood(existingFavorite.id, input);
  }

  const now = nowIsoString();
  const favoriteId = createEntityId('favorite');

  await database.runAsync(
    `
      INSERT INTO favorite_foods (
        id,
        source_entry_id,
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
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      favoriteId,
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

  return getFavoriteFoodById(favoriteId);
}

export async function createFoodEntryFromFavorite(
  favoriteId: string,
  overrides?: Partial<
    Pick<FoodEntryInput, 'quantityLabel' | 'quantityGrams' | 'notes' | 'consumedAt' | 'entryDate'>
  >
) {
  const favorite = await getFavoriteFoodById(favoriteId);

  if (!favorite) {
    throw new Error('Favorite food not found');
  }

  return createFoodEntry({
    mealName: favorite.name,
    quantityLabel: overrides?.quantityLabel ?? favorite.quantityLabel,
    quantityGrams: overrides?.quantityGrams ?? favorite.quantityGrams,
    totalCalories: favorite.totalCalories,
    proteinGrams: favorite.proteinGrams,
    carbsGrams: favorite.carbsGrams,
    fatGrams: favorite.fatGrams,
    notes: overrides?.notes ?? favorite.notes,
    imageUri: favorite.imageUri,
    thumbnailUri: favorite.thumbnailUri,
    consumedAt: overrides?.consumedAt,
    entryDate: overrides?.entryDate,
  });
}

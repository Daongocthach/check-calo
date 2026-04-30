import i18n from '@/i18n/config';
import { useAuthStore } from '@/providers/auth/authStore';
import { getDatabase } from '@/services/database/sqlite';
import { ensureDeviceLocalId } from '@/services/device/deviceLocalId';
import type { MealItemRecord, MealRecord } from '../types';
import { createEntityId, nowIsoString } from '../utils/calorie';
import type { PageRequest, PaginatedResult } from './pagination';

interface MealRow {
  local_id: string;
  remote_id: string | null;
  owner_type: MealRecord['ownerType'];
  device_local_id: string;
  user_id: string | null;
  meal_type: MealRecord['mealType'];
  note: string | null;
  eaten_at: string;
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
  sync_status: MealRecord['syncStatus'];
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MealItemRow {
  local_id: string;
  remote_id: string | null;
  meal_local_id: string;
  meal_remote_id: string | null;
  owner_type: MealItemRecord['ownerType'];
  device_local_id: string;
  user_id: string | null;
  source_key: string | null;
  title: string;
  quantity_label: string;
  quantity_grams: number | null;
  servings: number;
  total_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  notes: string | null;
  image_uri: string | null;
  thumbnail_uri: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface MealTotalsRow {
  total_calories: number | null;
  total_protein_grams: number | null;
  total_carbs_grams: number | null;
  total_fat_grams: number | null;
}

const DEFAULT_MANUAL_MEALS: ReadonlyArray<{
  mealType: MealRecord['mealType'];
  hour: number;
  minute: number;
}> = [
  { mealType: 'breakfast', hour: 7, minute: 0 },
  { mealType: 'lunch', hour: 12, minute: 0 },
  { mealType: 'dinner', hour: 18, minute: 30 },
];

let manualMealSeedQueue: Promise<void> = Promise.resolve();

export interface ManualMealItemInput {
  sourceKey?: string | null;
  title: string;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | null;
  imageUri?: string | null;
  thumbnailUri?: string | null;
  servings?: number;
}

export interface ManualMealItem extends MealItemRecord {}

export interface ManualMeal extends MealRecord {
  name: string;
  items: ManualMealItem[];
}

export interface ManualMealPageRequest extends PageRequest {}

export interface ManualMealListRequest extends ManualMealPageRequest {
  mealType?: MealRecord['mealType'] | 'all';
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ManualMealTotalsRequest {
  mealType?: MealRecord['mealType'] | 'all';
  startDate?: string | Date;
  endDate?: string | Date;
}

function mapMeal(row: MealRow): MealRecord {
  return {
    localId: row.local_id,
    remoteId: row.remote_id,
    ownerType: row.owner_type,
    deviceLocalId: row.device_local_id,
    userId: row.user_id,
    mealType: row.meal_type,
    note: row.note,
    eatenAt: row.eaten_at,
    totalCalories: row.total_calories,
    totalProteinGrams: row.total_protein_grams,
    totalCarbsGrams: row.total_carbs_grams,
    totalFatGrams: row.total_fat_grams,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapMealItem(row: MealItemRow): MealItemRecord {
  return {
    localId: row.local_id,
    remoteId: row.remote_id,
    mealLocalId: row.meal_local_id,
    mealRemoteId: row.meal_remote_id,
    ownerType: row.owner_type,
    deviceLocalId: row.device_local_id,
    userId: row.user_id,
    sourceKey: row.source_key,
    title: row.title,
    quantityLabel: row.quantity_label,
    quantityGrams: row.quantity_grams,
    servings: row.servings,
    totalCalories: row.total_calories,
    proteinGrams: row.protein_grams,
    carbsGrams: row.carbs_grams,
    fatGrams: row.fat_grams,
    notes: row.notes,
    imageUri: row.image_uri,
    thumbnailUri: row.thumbnail_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toMealName(note: string | null) {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : i18n.t('common.defaultMealName');
}

function translateMealType(mealType: MealRecord['mealType']) {
  const translate = i18n.t as unknown as (key: string) => string;
  return translate(`homeScreen.meals.${mealType}`);
}

function normalizePage(page?: number) {
  return Math.max(1, Math.floor(page ?? 1));
}

function normalizePageSize(pageSize?: number) {
  return Math.max(1, Math.floor(pageSize ?? 20));
}

function normalizeDayStart(value: string | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function normalizeDayEnd(value: string | Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function toLocalDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  const dayOffset = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - dayOffset);
  return nextDate;
}

async function getMealOwnerScope() {
  const { deviceLocalId } = await ensureDeviceLocalId();
  const authUserId = useAuthStore.getState().user?.id ?? null;

  return {
    deviceLocalId,
    userId: authUserId,
    ownerType: (authUserId ? 'user' : 'device') as MealRecord['ownerType'],
  };
}

async function runManualMealSeed(task: () => Promise<void>) {
  const nextSeed = manualMealSeedQueue.then(task, task);
  manualMealSeedQueue = nextSeed.catch(() => undefined);
  await nextSeed;
}

async function updateMealTotals(mealLocalId: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  const totals = await database.getFirstAsync<MealTotalsRow>(
    `
      SELECT
        COALESCE(SUM(total_calories * servings), 0) AS total_calories,
        COALESCE(SUM(protein_grams * servings), 0) AS total_protein_grams,
        COALESCE(SUM(carbs_grams * servings), 0) AS total_carbs_grams,
        COALESCE(SUM(fat_grams * servings), 0) AS total_fat_grams
      FROM meal_items
      WHERE meal_local_id = ? AND deleted_at IS NULL;
    `,
    [mealLocalId]
  );

  await database.runAsync(
    `
      UPDATE meals
      SET
        total_calories = ?,
        total_protein_grams = ?,
        total_carbs_grams = ?,
        total_fat_grams = ?,
        updated_at = ?
      WHERE local_id = ?;
    `,
    [
      totals?.total_calories ?? 0,
      totals?.total_protein_grams ?? 0,
      totals?.total_carbs_grams ?? 0,
      totals?.total_fat_grams ?? 0,
      now,
      mealLocalId,
    ]
  );
}

async function seedDefaultManualMealsIfEmpty() {
  await runManualMealSeed(async () => {
    const database = await getDatabase();
    const existingCount = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM meals WHERE deleted_at IS NULL LIMIT 1;'
    );

    if ((existingCount?.count ?? 0) > 0) {
      return;
    }

    const ownerScope = await getMealOwnerScope();
    const now = nowIsoString();
    const baseDate = new Date();
    baseDate.setSeconds(0, 0);

    for (const meal of DEFAULT_MANUAL_MEALS) {
      const eatenAtDate = new Date(baseDate);
      eatenAtDate.setHours(meal.hour, meal.minute, 0, 0);

      await database.runAsync(
        `
          INSERT INTO meals (
            local_id,
            remote_id,
            owner_type,
            device_local_id,
            user_id,
            meal_type,
            note,
            eaten_at,
            total_calories,
            total_protein_grams,
            total_carbs_grams,
            total_fat_grams,
            sync_status,
            sync_error,
            last_synced_at,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'local_only', NULL, NULL, ?, ?, NULL);
        `,
        [
          createEntityId('meal'),
          ownerScope.ownerType,
          ownerScope.deviceLocalId,
          ownerScope.userId,
          meal.mealType,
          translateMealType(meal.mealType),
          eatenAtDate.toISOString(),
          now,
          now,
        ]
      );
    }
  });
}

async function seedDefaultManualMealsForRangeIfMissing(
  startDate: string | Date,
  endDate: string | Date
) {
  await runManualMealSeed(async () => {
    const database = await getDatabase();
    const normalizedStartDate = new Date(normalizeDayStart(startDate));
    const normalizedEndDate = new Date(normalizeDayEnd(endDate));
    const existingMeals = await database.getAllAsync<{
      meal_type: MealRecord['mealType'];
      eaten_at: string;
    }>(
      `
        SELECT meal_type, eaten_at
        FROM meals
        WHERE deleted_at IS NULL
          AND eaten_at >= ?
          AND eaten_at <= ?;
      `,
      [normalizedStartDate.toISOString(), normalizedEndDate.toISOString()]
    );

    const existingMealKeys = new Set(
      existingMeals.map((meal) => `${toLocalDateKey(meal.eaten_at)}:${meal.meal_type}`)
    );
    const ownerScope = await getMealOwnerScope();
    const now = nowIsoString();
    const currentDate = new Date(normalizedStartDate);

    while (currentDate <= normalizedEndDate) {
      const dateKey = toLocalDateKey(currentDate);

      for (const meal of DEFAULT_MANUAL_MEALS) {
        const mealKey = `${dateKey}:${meal.mealType}`;

        if (existingMealKeys.has(mealKey)) {
          continue;
        }

        const eatenAtDate = new Date(currentDate);
        eatenAtDate.setHours(meal.hour, meal.minute, 0, 0);

        await database.runAsync(
          `
            INSERT INTO meals (
              local_id,
              remote_id,
              owner_type,
              device_local_id,
              user_id,
              meal_type,
              note,
              eaten_at,
              total_calories,
              total_protein_grams,
              total_carbs_grams,
              total_fat_grams,
              sync_status,
              sync_error,
              last_synced_at,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'local_only', NULL, NULL, ?, ?, NULL);
          `,
          [
            createEntityId('meal'),
            ownerScope.ownerType,
            ownerScope.deviceLocalId,
            ownerScope.userId,
            meal.mealType,
            translateMealType(meal.mealType),
            eatenAtDate.toISOString(),
            now,
            now,
          ]
        );

        existingMealKeys.add(mealKey);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  });
}

export async function ensureDefaultManualMealsForWeek(date: string | Date) {
  const weekStart = startOfWeek(new Date(date));
  const weekEnd = addDays(weekStart, 6);
  await seedDefaultManualMealsForRangeIfMissing(weekStart, weekEnd);
}

export async function listManualMealsPage(
  request: ManualMealListRequest = {}
): Promise<PaginatedResult<ManualMeal>> {
  await seedDefaultManualMealsIfEmpty();

  if (request.page === undefined || request.page === 1) {
    if (request.startDate && request.endDate) {
      await seedDefaultManualMealsForRangeIfMissing(request.startDate, request.endDate);
    }
  }

  const database = await getDatabase();
  const page = normalizePage(request.page);
  const pageSize = normalizePageSize(request.pageSize);
  const offset = (page - 1) * pageSize;
  const mealTypeClause = request.mealType && request.mealType !== 'all' ? 'AND meal_type = ?' : '';
  const mealTypeParams = request.mealType && request.mealType !== 'all' ? [request.mealType] : [];
  const startDateClause = request.startDate ? 'AND eaten_at >= ?' : '';
  const endDateClause = request.endDate ? 'AND eaten_at <= ?' : '';
  const dateParams: string[] = [];

  if (request.startDate) {
    dateParams.push(normalizeDayStart(request.startDate));
  }

  if (request.endDate) {
    dateParams.push(normalizeDayEnd(request.endDate));
  }

  const mealRows = await database.getAllAsync<MealRow>(
    `
      SELECT *
      FROM meals
      WHERE deleted_at IS NULL
      ${mealTypeClause}
      ${startDateClause}
      ${endDateClause}
      ORDER BY eaten_at DESC, local_id DESC
      LIMIT ? OFFSET ?;
    `,
    [...mealTypeParams, ...dateParams, pageSize + 1, offset]
  );

  if (mealRows.length === 0) {
    return {
      items: [],
      page,
      pageSize,
      hasNextPage: false,
    };
  }

  const hasNextPage = mealRows.length > pageSize;
  const pagedMealRows = hasNextPage ? mealRows.slice(0, pageSize) : mealRows;
  const mealIds = pagedMealRows.map((row) => row.local_id);
  const mealItemRows =
    mealIds.length === 0
      ? []
      : await database.getAllAsync<MealItemRow>(
          `
            SELECT *
            FROM meal_items
            WHERE deleted_at IS NULL
              AND meal_local_id IN (${mealIds.map(() => '?').join(', ')})
            ORDER BY created_at DESC;
          `,
          mealIds
        );

  const groupedItems = mealItemRows.reduce<Map<string, ManualMealItem[]>>((accumulator, row) => {
    const item = mapMealItem(row);
    const existing = accumulator.get(item.mealLocalId);

    if (existing) {
      existing.push(item);
    } else {
      accumulator.set(item.mealLocalId, [item]);
    }

    return accumulator;
  }, new Map<string, ManualMealItem[]>());

  return {
    items: pagedMealRows.map((row) => {
      const meal = mapMeal(row);

      return {
        ...meal,
        name: toMealName(meal.note),
        items: groupedItems.get(meal.localId) ?? [],
      };
    }),
    page,
    pageSize,
    hasNextPage,
  };
}

export async function getManualMealByLocalId(mealLocalId: string) {
  await seedDefaultManualMealsIfEmpty();

  const database = await getDatabase();
  const mealRow = await database.getFirstAsync<MealRow>(
    `
      SELECT *
      FROM meals
      WHERE deleted_at IS NULL AND local_id = ?
      LIMIT 1;
    `,
    [mealLocalId]
  );

  if (!mealRow) {
    return null;
  }

  const mealItemRows = await database.getAllAsync<MealItemRow>(
    `
      SELECT *
      FROM meal_items
      WHERE deleted_at IS NULL AND meal_local_id = ?
      ORDER BY created_at DESC;
    `,
    [mealLocalId]
  );

  const meal = mapMeal(mealRow);

  return {
    ...meal,
    name: toMealName(meal.note),
    items: mealItemRows.map(mapMealItem),
  };
}

export async function getManualMealByItemIds(mealLocalId: string, itemLocalId: string) {
  const meal = await getManualMealByLocalId(mealLocalId);

  if (!meal) {
    return null;
  }

  const item = meal.items.find((mealItem) => mealItem.localId === itemLocalId);

  return item ? { meal, item } : null;
}

export async function getManualMealsTotalCalories(request: ManualMealTotalsRequest = {}) {
  const database = await getDatabase();
  const mealTypeClause = request.mealType && request.mealType !== 'all' ? 'AND meal_type = ?' : '';
  const mealTypeParams = request.mealType && request.mealType !== 'all' ? [request.mealType] : [];
  const startDateClause = request.startDate ? 'AND eaten_at >= ?' : '';
  const endDateClause = request.endDate ? 'AND eaten_at <= ?' : '';
  const dateParams: string[] = [];

  if (request.startDate) {
    dateParams.push(normalizeDayStart(request.startDate));
  }

  if (request.endDate) {
    dateParams.push(normalizeDayEnd(request.endDate));
  }

  const row = await database.getFirstAsync<{ total_calories: number | null }>(
    `
      SELECT COALESCE(SUM(total_calories), 0) AS total_calories
      FROM meals
      WHERE deleted_at IS NULL
      ${mealTypeClause}
      ${startDateClause}
      ${endDateClause};
    `,
    [...mealTypeParams, ...dateParams]
  );

  return row?.total_calories ?? 0;
}

export async function listManualMeals() {
  const result = await listManualMealsPage();
  return result.items;
}

export async function createManualMeal(name: string) {
  const database = await getDatabase();
  const ownerScope = await getMealOwnerScope();
  const now = nowIsoString();
  const mealId = createEntityId('meal');

  await database.runAsync(
    `
      INSERT INTO meals (
        local_id,
        remote_id,
        owner_type,
        device_local_id,
        user_id,
        meal_type,
        note,
        eaten_at,
        total_calories,
        total_protein_grams,
        total_carbs_grams,
        total_fat_grams,
        sync_status,
        sync_error,
        last_synced_at,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (?, NULL, ?, ?, ?, 'other', ?, ?, 0, 0, 0, 0, 'local_only', NULL, NULL, ?, ?, NULL);
    `,
    [mealId, ownerScope.ownerType, ownerScope.deviceLocalId, ownerScope.userId, name, now, now, now]
  );

  return mealId;
}

export async function renameManualMeal(mealLocalId: string, name: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE meals
      SET note = ?, updated_at = ?
      WHERE local_id = ?;
    `,
    [name, now, mealLocalId]
  );
}

export async function deleteManualMeal(mealLocalId: string) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM meal_items WHERE meal_local_id = ?;', [mealLocalId]);
    await database.runAsync('DELETE FROM meals WHERE local_id = ?;', [mealLocalId]);
  });
}

export async function createManualMealItem(mealLocalId: string, input: ManualMealItemInput) {
  const database = await getDatabase();
  const ownerScope = await getMealOwnerScope();
  const now = nowIsoString();

  await database.runAsync(
    `
      INSERT INTO meal_items (
        local_id,
        remote_id,
        meal_local_id,
        meal_remote_id,
        owner_type,
        device_local_id,
        user_id,
        source_key,
        title,
        quantity_label,
        quantity_grams,
        servings,
        total_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
    `,
    [
      createEntityId('meal-item'),
      mealLocalId,
      ownerScope.ownerType,
      ownerScope.deviceLocalId,
      ownerScope.userId,
      input.sourceKey ?? null,
      input.title,
      input.quantityLabel,
      input.quantityGrams ?? null,
      Math.max(1, input.servings ?? 1),
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

  await updateMealTotals(mealLocalId);
}

export async function updateManualMealItem(itemLocalId: string, input: ManualMealItemInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existing = await database.getFirstAsync<{
    meal_local_id: string;
    source_key: string | null;
    image_uri: string | null;
    thumbnail_uri: string | null;
  }>(
    'SELECT meal_local_id, source_key, image_uri, thumbnail_uri FROM meal_items WHERE local_id = ? LIMIT 1;',
    [itemLocalId]
  );

  if (!existing?.meal_local_id) {
    throw new Error('Meal item not found');
  }

  await database.runAsync(
    `
      UPDATE meal_items
      SET
        title = ?,
        quantity_label = ?,
        quantity_grams = ?,
        source_key = ?,
        servings = ?,
        total_calories = ?,
        protein_grams = ?,
        carbs_grams = ?,
        fat_grams = ?,
        notes = ?,
        image_uri = ?,
        thumbnail_uri = ?,
        updated_at = ?
      WHERE local_id = ?;
    `,
    [
      input.title,
      input.quantityLabel,
      input.quantityGrams ?? null,
      input.sourceKey ?? existing.source_key,
      Math.max(1, input.servings ?? 1),
      input.totalCalories,
      input.proteinGrams,
      input.carbsGrams,
      input.fatGrams,
      input.notes ?? null,
      input.imageUri ?? existing.image_uri,
      input.thumbnailUri ?? existing.thumbnail_uri,
      now,
      itemLocalId,
    ]
  );

  await updateMealTotals(existing.meal_local_id);
}

export async function deleteManualMealItem(itemLocalId: string) {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<{ meal_local_id: string }>(
    'SELECT meal_local_id FROM meal_items WHERE local_id = ? LIMIT 1;',
    [itemLocalId]
  );

  if (!existing?.meal_local_id) {
    return;
  }

  await database.runAsync('DELETE FROM meal_items WHERE local_id = ?;', [itemLocalId]);
  await updateMealTotals(existing.meal_local_id);
}

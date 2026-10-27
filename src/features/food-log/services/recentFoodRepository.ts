import { getDatabase } from '@/services/database/sqlite';
import { nowIsoString } from '@/utils/date';
import { createEntityId } from '@/utils/id';
import type { PageRequest, PaginatedResult } from '@/utils/pagination';
import type { FoodEntryInput, NutrientValues, RecentFood } from '../types';
import { NUTRIENT_SQL, pickNutrients, toNutrientParams } from '../utils/nutrients';
import { createFoodEntry } from './foodEntryRepository';
import { getFoodEntryById, mapRecentFood } from './foodEntryRepositoryCore';
import type { RecentFoodRow } from './foodEntryRepositoryCore';
import { deleteRecentFoodFromCloud, syncRecentFoodToCloud } from './recentFoodSync';

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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?);
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
      ...toNutrientParams(entry),
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
  > &
    Partial<NutrientValues>
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
        ${NUTRIENT_SQL.assignments},
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
      ...toNutrientParams(input),
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
  > &
    Partial<NutrientValues>
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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        thumbnail_uri,
        created_at,
        updated_at
      )
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?);
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
      ...toNutrientParams(input),
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
    ...pickNutrients(recent),
    notes: overrides?.notes ?? recent.notes,
    imageUri: recent.imageUri,
    thumbnailUri: recent.thumbnailUri,
    consumedAt: overrides?.consumedAt,
    entryDate: overrides?.entryDate,
  });
}

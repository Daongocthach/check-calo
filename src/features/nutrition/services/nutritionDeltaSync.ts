import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/storage/constants';
import type { ActivityLevel, Gender, UserProfileInput } from '../types';
import { formatDateKey } from '../utils/calorie';
import { upsertUserProfile, getUserProfile } from './nutritionDatabase';

interface SupabaseFoodEntryRow {
  id: string;
  user_id: string;
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
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseRecentFoodRow {
  id: string;
  user_id: string;
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
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseMealRow {
  id: string;
  user_id: string;
  device_local_id: string;
  meal_type: string;
  note: string | null;
  eaten_at: string;
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
  created_at: string;
  updated_at: string;
}

interface SupabaseMealItemRow {
  id: string;
  meal_id: string;
  user_id: string;
  device_local_id: string;
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
}

interface NutritionDeltaSyncResult {
  syncedCount: number;
  lastCursor: string | null;
}

type NutritionDeltaCursorMap = Record<string, string>;

const FOOD_ENTRIES_SYNC_PAGE_SIZE = 500;

let isFoodEntriesDeltaSyncRunning = false;
let isRecentFoodsDeltaSyncRunning = false;

function hasSupabaseConfiguration() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

function toNullableString(value: string | null | undefined) {
  return value ?? null;
}

async function upsertFoodEntryFromCloudRow(
  database: Awaited<ReturnType<typeof getDatabase>>,
  row: SupabaseFoodEntryRow
) {
  await database.runAsync(
    `
      INSERT INTO food_entries (
        id,
        user_id,
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
        barcode,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        entry_date = excluded.entry_date,
        consumed_at = excluded.consumed_at,
        meal_name = excluded.meal_name,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        notes = excluded.notes,
        image_uri = excluded.image_uri,
        thumbnail_uri = excluded.thumbnail_uri,
        barcode = excluded.barcode,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      row.id,
      row.user_id,
      formatDateKey(row.entry_date),
      row.consumed_at,
      row.meal_name,
      row.quantity_label,
      row.quantity_grams,
      row.total_calories,
      row.protein_grams,
      row.carbs_grams,
      row.fat_grams,
      toNullableString(row.notes),
      toNullableString(row.image_uri),
      toNullableString(row.thumbnail_uri),
      toNullableString(row.barcode),
      row.created_at,
      row.updated_at,
    ]
  );
}

async function upsertRecentFoodFromCloudRow(
  database: Awaited<ReturnType<typeof getDatabase>>,
  row: SupabaseRecentFoodRow
) {
  await database.runAsync(
    `
      INSERT INTO recent_foods (
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
        barcode,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_entry_id = excluded.source_entry_id,
        name = excluded.name,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        notes = excluded.notes,
        image_uri = excluded.image_uri,
        thumbnail_uri = excluded.thumbnail_uri,
        barcode = excluded.barcode,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      row.id,
      toNullableString(row.source_entry_id),
      row.name,
      row.quantity_label,
      row.quantity_grams,
      row.total_calories,
      row.protein_grams,
      row.carbs_grams,
      row.fat_grams,
      toNullableString(row.notes),
      toNullableString(row.image_uri),
      toNullableString(row.thumbnail_uri),
      toNullableString(row.barcode),
      row.created_at,
      row.updated_at,
    ]
  );
}

async function upsertMealFromCloudRow(
  database: Awaited<ReturnType<typeof getDatabase>>,
  row: SupabaseMealRow
) {
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
      ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL, ?, ?, ?, NULL)
      ON CONFLICT(local_id) DO UPDATE SET
        remote_id = excluded.remote_id,
        owner_type = 'user',
        device_local_id = excluded.device_local_id,
        user_id = excluded.user_id,
        meal_type = excluded.meal_type,
        note = excluded.note,
        eaten_at = excluded.eaten_at,
        total_calories = excluded.total_calories,
        total_protein_grams = excluded.total_protein_grams,
        total_carbs_grams = excluded.total_carbs_grams,
        total_fat_grams = excluded.total_fat_grams,
        sync_status = 'synced',
        last_synced_at = excluded.last_synced_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      row.id,
      row.id,
      row.device_local_id,
      row.user_id,
      row.meal_type,
      toNullableString(row.note),
      row.eaten_at,
      row.total_calories,
      row.total_protein_grams,
      row.total_carbs_grams,
      row.total_fat_grams,
      row.updated_at,
      row.created_at,
      row.updated_at,
    ]
  );
}

async function upsertMealItemFromCloudRow(
  database: Awaited<ReturnType<typeof getDatabase>>,
  row: SupabaseMealItemRow
) {
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
      ) VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(local_id) DO UPDATE SET
        remote_id = excluded.remote_id,
        meal_local_id = excluded.meal_local_id,
        meal_remote_id = excluded.meal_remote_id,
        owner_type = 'user',
        device_local_id = excluded.device_local_id,
        user_id = excluded.user_id,
        source_key = excluded.source_key,
        title = excluded.title,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        servings = excluded.servings,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        notes = excluded.notes,
        image_uri = excluded.image_uri,
        thumbnail_uri = excluded.thumbnail_uri,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `,
    [
      row.id,
      row.id,
      row.meal_id,
      row.meal_id,
      row.device_local_id,
      row.user_id,
      toNullableString(row.source_key),
      row.title,
      row.quantity_label,
      row.quantity_grams,
      row.servings,
      row.total_calories,
      row.protein_grams,
      row.carbs_grams,
      row.fat_grams,
      toNullableString(row.notes),
      toNullableString(row.image_uri),
      toNullableString(row.thumbnail_uri),
      row.created_at,
      row.updated_at,
    ]
  );
}

export async function syncFoodEntriesDeltaFromSupabase(
  isRecursive = false
): Promise<NutritionDeltaSyncResult> {
  if (!isRecursive && isFoodEntriesDeltaSyncRunning) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!hasSupabaseConfiguration()) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!isRecursive) {
    isFoodEntriesDeltaSyncRunning = true;
  }

  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return { syncedCount: 0, lastCursor: null };
    }

    const database = await getDatabase();
    const cursorResult = getItem<NutritionDeltaCursorMap>(
      STORAGE_KEYS.app.nutritionDeltaFoodEntriesCursor
    );
    const cursorMap = cursorResult.success ? (cursorResult.data ?? {}) : {};
    const cursor = cursorMap[userId] ?? null;

    if (__DEV__) {
      console.log('[DeltaSync] Query params:', {
        userId,
        cursor,
        cursorFallback: cursor ?? '1970-01-01T00:00:00.000Z',
        pageSize: FOOD_ENTRIES_SYNC_PAGE_SIZE,
      });
    }

    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor ?? '1970-01-01T00:00:00.000Z')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(FOOD_ENTRIES_SYNC_PAGE_SIZE);

    if (__DEV__) {
      console.log('[DeltaSync] Result:', {
        error: error?.message ?? null,
        rowCount: data?.length ?? 0,
        firstRow: data?.[0]
          ? { id: data[0].id, entry_date: data[0].entry_date, updated_at: data[0].updated_at }
          : null,
        lastRow: data?.length
          ? {
              id: data[data.length - 1].id,
              entry_date: data[data.length - 1].entry_date,
              updated_at: data[data.length - 1].updated_at,
            }
          : null,
      });
    }

    if (error || !data) {
      return { syncedCount: 0, lastCursor: cursor };
    }

    let lastCursor = cursor;

    for (const row of data as SupabaseFoodEntryRow[]) {
      try {
        await upsertFoodEntryFromCloudRow(database, row);

        if (!lastCursor || row.updated_at > lastCursor) {
          lastCursor = row.updated_at;
        }
      } catch (err) {
        if (__DEV__) {
          console.error('[DeltaSync] Failed to upsert food entry:', row.id, err);
        }
      }
    }

    if (lastCursor && lastCursor !== cursor) {
      const updatedCursorMap = {
        ...cursorMap,
        [userId]: lastCursor,
      };
      await setItem<NutritionDeltaCursorMap>(
        STORAGE_KEYS.app.nutritionDeltaFoodEntriesCursor,
        updatedCursorMap
      );

      // If we reached the page size, there might be more data
      if (data.length >= FOOD_ENTRIES_SYNC_PAGE_SIZE) {
        const nextResult = await syncFoodEntriesDeltaFromSupabase(true);
        return {
          syncedCount: data.length + nextResult.syncedCount,
          lastCursor: nextResult.lastCursor ?? lastCursor,
        };
      }
    }

    return { syncedCount: data.length, lastCursor };
  } finally {
    if (!isRecursive) {
      isFoodEntriesDeltaSyncRunning = false;
    }
  }
}

export async function syncRecentFoodsDeltaFromSupabase(
  isRecursive = false
): Promise<NutritionDeltaSyncResult> {
  if ((!isRecursive && isRecentFoodsDeltaSyncRunning) || !hasSupabaseConfiguration()) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!isRecursive) {
    isRecentFoodsDeltaSyncRunning = true;
  }

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { syncedCount: 0, lastCursor: null };

    const database = await getDatabase();
    const cursorResult = getItem<NutritionDeltaCursorMap>(
      STORAGE_KEYS.app.nutritionDeltaRecentFoodsCursor
    );
    const cursorMap = cursorResult.success ? (cursorResult.data ?? {}) : {};
    const cursor = cursorMap[userId] ?? null;

    let query = supabase
      .from('recent_foods')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .limit(FOOD_ENTRIES_SYNC_PAGE_SIZE);

    if (cursor) {
      query = query.gt('updated_at', cursor);
    }

    const { data, error } = await query;

    if (error || !data) return { syncedCount: 0, lastCursor: cursor };

    let lastCursor = cursor;

    for (const row of data as SupabaseRecentFoodRow[]) {
      await upsertRecentFoodFromCloudRow(database, row);
      if (!lastCursor || row.updated_at > lastCursor) {
        lastCursor = row.updated_at;
      }
    }

    if (lastCursor && lastCursor !== cursor) {
      const updatedCursorMap = {
        ...cursorMap,
        [userId]: lastCursor,
      };
      await setItem(STORAGE_KEYS.app.nutritionDeltaRecentFoodsCursor, updatedCursorMap);

      // If we reached the page size, there might be more data
      if (data.length >= FOOD_ENTRIES_SYNC_PAGE_SIZE) {
        const nextResult = await syncRecentFoodsDeltaFromSupabase(true);
        return {
          syncedCount: data.length + nextResult.syncedCount,
          lastCursor: nextResult.lastCursor ?? lastCursor,
        };
      }
    }

    return { syncedCount: data.length, lastCursor };
  } finally {
    if (!isRecursive) {
      isRecentFoodsDeltaSyncRunning = false;
    }
  }
}

export async function syncUserProfileFromCloud() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('gender, age, height_cm, weight_kg, desired_weight_kg, activity_level, display_name')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    if (__DEV__) {
      console.log('[ProfileSync] Failed to fetch profile from cloud:', error?.message);
    }
    return false;
  }

  if (!data.gender || !data.age || !data.height_cm || !data.weight_kg || !data.activity_level) {
    // Missing required fields on cloud, cannot overwrite local profile
    return false;
  }

  const existingProfile = await getUserProfile();
  const monthlyWeightGoalKg = existingProfile?.monthlyWeightGoalKg ?? 0;

  const input: UserProfileInput = {
    displayName: data.display_name ?? '',
    gender: data.gender as Gender,
    age: data.age,
    heightCm: data.height_cm,
    weightKg: data.weight_kg,
    monthlyWeightGoalKg: data.desired_weight_kg
      ? Math.round((((data.weight_kg - data.desired_weight_kg) * 30) / 42) * 10) / 10
      : monthlyWeightGoalKg,
    activityLevel: data.activity_level as ActivityLevel,
  };

  await upsertUserProfile(input);
  return true;
}

export async function syncUserProfileToCloud(profile: UserProfileInput) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: profile.displayName,
      gender: profile.gender,
      age: profile.age,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      desired_weight_kg: profile.monthlyWeightGoalKg
        ? profile.weightKg - (profile.monthlyWeightGoalKg * 42) / 30
        : null,
      activity_level: profile.activityLevel,
    })
    .eq('user_id', userId);

  if (error) {
    if (__DEV__) {
      console.log('[ProfileSync] Failed to push profile to cloud:', error.message);
    }
    return false;
  }

  return true;
}

export async function syncMealsDeltaFromSupabase(
  isRecursive = false
): Promise<NutritionDeltaSyncResult> {
  if (!isRecursive && isFoodEntriesDeltaSyncRunning) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!isRecursive) {
    isFoodEntriesDeltaSyncRunning = true;
  }

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { syncedCount: 0, lastCursor: null };

    const cursorMap =
      getItem<NutritionDeltaCursorMap>(STORAGE_KEYS.app.nutritionDeltaMealsCursor).data ?? {};
    const cursor = cursorMap[userId];

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor ?? '1970-01-01T00:00:00.000Z')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(FOOD_ENTRIES_SYNC_PAGE_SIZE);

    if (error) throw error;
    if (!data || data.length === 0) return { syncedCount: 0, lastCursor: cursor ?? null };

    const database = await getDatabase();
    let lastCursor = cursor;

    for (const row of data as SupabaseMealRow[]) {
      try {
        await upsertMealFromCloudRow(database, row);
        if (!lastCursor || row.updated_at > lastCursor) lastCursor = row.updated_at;
      } catch (err) {
        if (__DEV__) console.error('[DeltaSync] Failed to upsert meal:', row.id, err);
      }
    }

    if (lastCursor && lastCursor !== cursor) {
      const updatedCursorMap = { ...cursorMap, [userId]: lastCursor };
      await setItem(STORAGE_KEYS.app.nutritionDeltaMealsCursor, updatedCursorMap);

      if (data.length >= FOOD_ENTRIES_SYNC_PAGE_SIZE) {
        const nextResult = await syncMealsDeltaFromSupabase(true);
        return {
          syncedCount: data.length + nextResult.syncedCount,
          lastCursor: nextResult.lastCursor ?? lastCursor,
        };
      }
    }

    return { syncedCount: data.length, lastCursor };
  } finally {
    if (!isRecursive) isFoodEntriesDeltaSyncRunning = false;
  }
}

export async function syncMealItemsDeltaFromSupabase(
  isRecursive = false
): Promise<NutritionDeltaSyncResult> {
  if (!isRecursive && isFoodEntriesDeltaSyncRunning) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!isRecursive) {
    isFoodEntriesDeltaSyncRunning = true;
  }

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { syncedCount: 0, lastCursor: null };

    const cursorMap =
      getItem<NutritionDeltaCursorMap>(STORAGE_KEYS.app.nutritionDeltaMealItemsCursor).data ?? {};
    const cursor = cursorMap[userId];

    const { data, error } = await supabase
      .from('meal_items')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', cursor ?? '1970-01-01T00:00:00.000Z')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(FOOD_ENTRIES_SYNC_PAGE_SIZE);

    if (error) throw error;
    if (!data || data.length === 0) return { syncedCount: 0, lastCursor: cursor ?? null };

    const database = await getDatabase();
    let lastCursor = cursor;

    for (const row of data as SupabaseMealItemRow[]) {
      try {
        await upsertMealItemFromCloudRow(database, row);
        if (!lastCursor || row.updated_at > lastCursor) lastCursor = row.updated_at;
      } catch (err) {
        if (__DEV__) console.error('[DeltaSync] Failed to upsert meal item:', row.id, err);
      }
    }

    if (lastCursor && lastCursor !== cursor) {
      const updatedCursorMap = { ...cursorMap, [userId]: lastCursor };
      await setItem(STORAGE_KEYS.app.nutritionDeltaMealItemsCursor, updatedCursorMap);

      if (data.length >= FOOD_ENTRIES_SYNC_PAGE_SIZE) {
        const nextResult = await syncMealItemsDeltaFromSupabase(true);
        return {
          syncedCount: data.length + nextResult.syncedCount,
          lastCursor: nextResult.lastCursor ?? lastCursor,
        };
      }
    }

    return { syncedCount: data.length, lastCursor };
  } finally {
    if (!isRecursive) isFoodEntriesDeltaSyncRunning = false;
  }
}

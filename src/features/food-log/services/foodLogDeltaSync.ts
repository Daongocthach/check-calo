import { env } from '@/config/env';
import { upsertUserProfile, getUserProfile } from '@/features/profile/services/profileRepository';
import type { ActivityLevel, Gender, UserProfileInput } from '@/features/profile/types';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey } from '@/utils/date';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/storage/constants';
import { NUTRIENT_SQL, nutrientsFromColumns, toNutrientParams } from '../utils/nutrients';
import type { NutrientColumnValues } from '../utils/nutrients';

/** Nutrient columns are absent until the cloud migration that adds them has run. */
interface SupabaseFoodEntryRow extends Partial<NutrientColumnValues> {
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

interface SupabaseRecentFoodRow extends Partial<NutrientColumnValues> {
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

interface CloudProfileRow {
  display_name: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  desired_weight_kg: number | null;
  activity_level: string | null;
  /** Null for profiles last saved by an app version without weight goals. */
  monthly_weight_goal_kg?: number | null;
  target_weight_kg?: number | null;
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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        thumbnail_uri,
        barcode,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?, ?)
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
        ${NUTRIENT_SQL.excluded},
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
      ...toNutrientParams(nutrientsFromColumns(row)),
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
        ${NUTRIENT_SQL.columns},
        notes,
        image_uri,
        thumbnail_uri,
        barcode,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${NUTRIENT_SQL.placeholders}, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_entry_id = excluded.source_entry_id,
        name = excluded.name,
        quantity_label = excluded.quantity_label,
        quantity_grams = excluded.quantity_grams,
        total_calories = excluded.total_calories,
        protein_grams = excluded.protein_grams,
        carbs_grams = excluded.carbs_grams,
        fat_grams = excluded.fat_grams,
        ${NUTRIENT_SQL.excluded},
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
      ...toNutrientParams(nutrientsFromColumns(row)),
      toNullableString(row.notes),
      toNullableString(row.image_uri),
      toNullableString(row.thumbnail_uri),
      toNullableString(row.barcode),
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
      console.warn('[DeltaSync] Query params:', {
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
      console.warn('[DeltaSync] Result:', {
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
      try {
        await upsertRecentFoodFromCloudRow(database, row);

        if (!lastCursor || row.updated_at > lastCursor) {
          lastCursor = row.updated_at;
        }
      } catch (err) {
        if (__DEV__) {
          console.error('[DeltaSync] Failed to upsert recent food:', row.id, err);
        }
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

  const { data, error } = await supabase.rpc('get_my_profile').maybeSingle<CloudProfileRow>();

  if (error || !data) {
    if (__DEV__) {
      console.warn('[ProfileSync] Failed to fetch profile from cloud:', error?.message);
    }
    return false;
  }

  if (!data.gender || !data.age || !data.height_cm || !data.weight_kg || !data.activity_level) {
    // Missing required fields on cloud, cannot overwrite local profile
    return false;
  }

  const existingProfile = await getUserProfile();
  const monthlyWeightGoalKg = existingProfile?.monthlyWeightGoalKg ?? 0;
  // Older app versions only stored desired_weight_kg, derived from the monthly rate.
  const legacyMonthlyWeightGoalKg = data.desired_weight_kg
    ? Math.round((((data.weight_kg - data.desired_weight_kg) * 30) / 42) * 10) / 10
    : monthlyWeightGoalKg;

  const input: UserProfileInput = {
    displayName: data.display_name ?? '',
    gender: data.gender as Gender,
    age: data.age,
    heightCm: data.height_cm,
    weightKg: data.weight_kg,
    monthlyWeightGoalKg:
      data.monthly_weight_goal_kg === null || data.monthly_weight_goal_kg === undefined
        ? legacyMonthlyWeightGoalKg
        : Number(data.monthly_weight_goal_kg),
    targetWeightKg:
      data.target_weight_kg === null || data.target_weight_kg === undefined
        ? (existingProfile?.targetWeightKg ?? null)
        : Number(data.target_weight_kg),
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
      monthly_weight_goal_kg: profile.monthlyWeightGoalKg,
      target_weight_kg: profile.targetWeightKg,
    })
    .eq('user_id', userId);

  if (error) {
    if (__DEV__) {
      console.warn('[ProfileSync] Failed to push profile to cloud:', error.message);
    }
    return false;
  }

  return true;
}

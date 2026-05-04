import { env } from '@/config/env';
import { supabase } from '@/integrations/supabase';
import { getDatabase } from '@/services/database/sqlite';
import { getItem, setItem } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/storage/constants';
import { formatDateKey } from '../utils/calorie';

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

interface NutritionDeltaSyncResult {
  syncedCount: number;
  lastCursor: string | null;
}

type NutritionDeltaCursorMap = Record<string, string>;

const FOOD_ENTRIES_SYNC_PAGE_SIZE = 500;

let isFoodEntriesDeltaSyncRunning = false;

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

export async function syncFoodEntriesDeltaFromSupabase(): Promise<NutritionDeltaSyncResult> {
  if (isFoodEntriesDeltaSyncRunning) {
    return { syncedCount: 0, lastCursor: null };
  }

  if (!hasSupabaseConfiguration()) {
    return { syncedCount: 0, lastCursor: null };
  }

  isFoodEntriesDeltaSyncRunning = true;

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

    const { data, error } = await supabase
      .from('food_entries')
      .select(
        'id, user_id, entry_date, consumed_at, meal_name, quantity_label, quantity_grams, total_calories, protein_grams, carbs_grams, fat_grams, notes, image_uri, thumbnail_uri, barcode, created_at, updated_at'
      )
      .eq('user_id', userId)
      .gt('updated_at', cursor ?? '1970-01-01T00:00:00.000Z')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(FOOD_ENTRIES_SYNC_PAGE_SIZE);

    if (error || !data) {
      return { syncedCount: 0, lastCursor: cursor };
    }

    let lastCursor = cursor;

    for (const row of data as SupabaseFoodEntryRow[]) {
      await upsertFoodEntryFromCloudRow(database, row);

      if (!lastCursor || row.updated_at > lastCursor) {
        lastCursor = row.updated_at;
      }
    }

    if (lastCursor && lastCursor !== cursor) {
      await setItem<NutritionDeltaCursorMap>(STORAGE_KEYS.app.nutritionDeltaFoodEntriesCursor, {
        ...cursorMap,
        [userId]: lastCursor,
      });
    }

    return { syncedCount: data.length, lastCursor };
  } finally {
    isFoodEntriesDeltaSyncRunning = false;
  }
}

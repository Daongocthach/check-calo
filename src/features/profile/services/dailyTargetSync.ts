import { supabase } from '@/integrations/supabase';
import type { DailyTargetRecord } from '../types';
import {
  applyCloudDailyTargets,
  listPendingDailyTargets,
  markDailyTargetsSynced,
  type PendingDailyTarget,
} from './dailyTargetRepository';

interface SupabaseDailyTargetRow {
  target_date: string;
  calorie_target: number;
  protein_target_grams: number | string | null;
  carbs_target_grams: number | string | null;
  fat_target_grams: number | string | null;
  goal_mode: DailyTargetRecord['goalMode'];
  source: DailyTargetRecord['source'];
  created_at: string;
  updated_at: string;
}

const TABLE = 'daily_targets';
// PostgREST caps a response at 1000 rows by default; a plan is saved for every logged day.
const PAGE_SIZE = 1000;
const PUSH_BATCH_SIZE = 500;

let isDailyTargetSyncRunning = false;

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function toNullableNumber(value: number | string | null) {
  return value === null ? null : Number(value);
}

/** Postgres returns `+00:00` timestamps; local rows compare them as ISO strings. */
function toIsoString(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

function toCloudRow(userId: string, target: DailyTargetRecord) {
  return {
    user_id: userId,
    target_date: target.date,
    calorie_target: Math.round(target.calorieTarget),
    protein_target_grams: target.proteinTargetGrams,
    carbs_target_grams: target.carbsTargetGrams,
    fat_target_grams: target.fatTargetGrams,
    goal_mode: target.goalMode,
    source: target.source,
    created_at: target.createdAt,
    updated_at: target.updatedAt,
  };
}

function fromCloudRow(row: SupabaseDailyTargetRow): DailyTargetRecord {
  return {
    date: row.target_date,
    calorieTarget: Number(row.calorie_target),
    proteinTargetGrams: toNullableNumber(row.protein_target_grams),
    carbsTargetGrams: toNullableNumber(row.carbs_target_grams),
    fatTargetGrams: toNullableNumber(row.fat_target_grams),
    goalMode: row.goal_mode,
    source: row.source,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

async function upsertTargets(userId: string, targets: PendingDailyTarget[], overwrite: boolean) {
  for (let index = 0; index < targets.length; index += PUSH_BATCH_SIZE) {
    const batch = targets.slice(index, index + PUSH_BATCH_SIZE);
    const { error } = await supabase.from(TABLE).upsert(
      batch.map((target) => toCloudRow(userId, target)),
      { onConflict: 'user_id,target_date', ignoreDuplicates: !overwrite }
    );

    if (error) {
      if (__DEV__) {
        console.warn('[DailyTargetSync] Failed to push day plans:', error.message);
      }
      return false;
    }

    await markDailyTargetsSynced(batch);
  }

  return true;
}

/**
 * Pushes plans saved while offline (or before sign-in). A frozen plan does not replace the
 * cloud copy, so the next pull brings back the plan another device froze first.
 */
export async function pushPendingDailyTargets() {
  const userId = await getSessionUserId();

  if (!userId) {
    return false;
  }

  const pending = await listPendingDailyTargets();
  const changed = pending.filter((target) => target.overwrite);
  const frozen = pending.filter((target) => !target.overwrite);

  if (!(await upsertTargets(userId, changed, true))) {
    return false;
  }

  return upsertTargets(userId, frozen, false);
}

async function fetchCloudDailyTargets() {
  const rows: SupabaseDailyTargetRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        'target_date, calorie_target, protein_target_grams, carbs_target_grams, fat_target_grams, goal_mode, source, created_at, updated_at'
      )
      .order('target_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<SupabaseDailyTargetRow[]>();

    if (error || !data) {
      if (__DEV__) {
        console.warn('[DailyTargetSync] Failed to pull day plans:', error?.message);
      }
      return null;
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/**
 * Pulls cloud plans and returns how many local ones changed. With `replace` (after signing
 * in), the cloud plans replace the local ones; an account with none keeps the local plans.
 */
export async function pullDailyTargetsFromCloud({ replace = false }: { replace?: boolean } = {}) {
  const userId = await getSessionUserId();

  if (!userId) {
    return 0;
  }

  const rows = await fetchCloudDailyTargets();

  if (!rows || rows.length === 0) {
    return 0;
  }

  return applyCloudDailyTargets(rows.map(fromCloudRow), { replace });
}

export async function syncDailyTargets() {
  if (isDailyTargetSyncRunning) {
    return 0;
  }

  isDailyTargetSyncRunning = true;

  try {
    await pushPendingDailyTargets();
    return await pullDailyTargetsFromCloud();
  } finally {
    isDailyTargetSyncRunning = false;
  }
}

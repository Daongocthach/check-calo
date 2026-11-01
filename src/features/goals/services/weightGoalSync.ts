import { supabase } from '@/integrations/supabase';
import type { WeightGoal } from '../types';
import {
  applyCloudWeightGoals,
  listPendingWeightGoals,
  markWeightGoalsSynced,
} from './goalTrackingRepository';

type NumericValue = number | string;

interface SupabaseWeightGoalRow {
  id: string;
  mode: WeightGoal['mode'];
  target_kg: NumericValue | null;
  target_kcal_delta: number;
  target_days: number;
  start_weight_kg: NumericValue | null;
  target_weight_kg: NumericValue | null;
  monthly_rate_kg: NumericValue | null;
  status: WeightGoal['status'];
  started_at: string;
  completed_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'weight_goals';

let isWeightGoalSyncRunning = false;

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function toNullableNumber(value: NumericValue | null) {
  return value === null ? null : Number(value);
}

/** Postgres returns `+00:00` timestamps; local rows compare and sort them as ISO strings. */
function toIsoString(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

function fromCloudRow(row: SupabaseWeightGoalRow): WeightGoal {
  return {
    id: row.id,
    mode: row.mode,
    targetKg: toNullableNumber(row.target_kg),
    targetKcalDelta: row.target_kcal_delta,
    targetDays: row.target_days,
    startWeightKg: toNullableNumber(row.start_weight_kg),
    targetWeightKg: toNullableNumber(row.target_weight_kg),
    monthlyRateKg: toNullableNumber(row.monthly_rate_kg),
    status: row.status,
    startedAt: toIsoString(row.started_at),
    completedAt: row.completed_at ? toIsoString(row.completed_at) : null,
    endedAt: row.ended_at ? toIsoString(row.ended_at) : null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

/** Pushes goals started, changed or ended while offline (or before sign-in). */
export async function pushPendingWeightGoals() {
  const userId = await getSessionUserId();

  if (!userId) {
    return false;
  }

  const pending = await listPendingWeightGoals();

  if (pending.length === 0) {
    return true;
  }

  const { error } = await supabase.from(TABLE).upsert(
    pending.map((goal) => ({
      user_id: userId,
      id: goal.id,
      mode: goal.mode,
      target_kg: goal.targetKg,
      target_kcal_delta: Math.round(goal.targetKcalDelta),
      target_days: Math.round(goal.targetDays),
      start_weight_kg: goal.startWeightKg,
      target_weight_kg: goal.targetWeightKg,
      monthly_rate_kg: goal.monthlyRateKg,
      status: goal.status,
      started_at: goal.startedAt,
      completed_at: goal.completedAt,
      ended_at: goal.endedAt,
      created_at: goal.createdAt,
      updated_at: goal.updatedAt,
    })),
    { onConflict: 'user_id,id' }
  );

  if (error) {
    if (__DEV__) {
      console.warn('[WeightGoalSync] Failed to push goals:', error.message);
    }
    return false;
  }

  await markWeightGoalsSynced(pending);
  return true;
}

/**
 * Pulls cloud goals and returns how many local ones changed. With `replace` (after signing
 * in), the cloud goals replace the local ones; an account with none keeps the local goals.
 */
export async function pullWeightGoalsFromCloud({ replace = false }: { replace?: boolean } = {}) {
  const userId = await getSessionUserId();

  if (!userId) {
    return 0;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(
      'id, mode, target_kg, target_kcal_delta, target_days, start_weight_kg, target_weight_kg, monthly_rate_kg, status, started_at, completed_at, ended_at, created_at, updated_at'
    )
    .order('started_at', { ascending: true })
    .returns<SupabaseWeightGoalRow[]>();

  if (error || !data) {
    if (__DEV__) {
      console.warn('[WeightGoalSync] Failed to pull goals:', error?.message);
    }
    return 0;
  }

  if (data.length === 0) {
    return 0;
  }

  return applyCloudWeightGoals(data.map(fromCloudRow), { replace });
}

export async function syncWeightGoals() {
  if (isWeightGoalSyncRunning) {
    return 0;
  }

  isWeightGoalSyncRunning = true;

  try {
    await pushPendingWeightGoals();
    return await pullWeightGoalsFromCloud();
  } finally {
    isWeightGoalSyncRunning = false;
  }
}

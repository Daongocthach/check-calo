import { supabase } from '@/integrations/supabase';
import {
  getWeightLog,
  listUnsyncedWeightLogs,
  markWeightLogsSynced,
  upsertWeightLog,
} from './weightLogRepository';

interface SupabaseWeightLogRow {
  log_date: string;
  weight_kg: number;
  created_at: string;
  updated_at: string;
}

let isWeightLogSyncRunning = false;

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Pushes weigh-ins saved while offline (or before sign-in) to the cloud. */
export async function pushPendingWeightLogs() {
  const userId = await getSessionUserId();

  if (!userId) {
    return false;
  }

  const pending = await listUnsyncedWeightLogs();

  if (pending.length === 0) {
    return true;
  }

  const { error } = await supabase.from('weight_logs').upsert(
    pending.map((log) => ({
      user_id: userId,
      log_date: log.date,
      weight_kg: log.weightKg,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
    })),
    { onConflict: 'user_id,log_date' }
  );

  if (error) {
    if (__DEV__) {
      console.warn('[WeightLogSync] Failed to push weigh-ins:', error.message);
    }
    return false;
  }

  await markWeightLogsSynced(pending);
  return true;
}

/** Pulls cloud weigh-ins; a local edit that has not been pushed yet wins. */
export async function pullWeightLogsFromCloud() {
  const userId = await getSessionUserId();

  if (!userId) {
    return 0;
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .select('log_date, weight_kg, created_at, updated_at')
    .order('log_date', { ascending: true })
    .returns<SupabaseWeightLogRow[]>();

  if (error || !data) {
    if (__DEV__) {
      console.warn('[WeightLogSync] Failed to pull weigh-ins:', error?.message);
    }
    return 0;
  }

  let changed = 0;

  for (const row of data) {
    const local = await getWeightLog(row.log_date);
    const isNewer = !local || Date.parse(row.updated_at) > Date.parse(local.updatedAt);

    if (local && !local.synced) {
      continue;
    }

    if (isNewer) {
      await upsertWeightLog(row.log_date, Number(row.weight_kg), {
        synced: true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
      changed += 1;
    }
  }

  return changed;
}

export async function syncWeightLogs() {
  if (isWeightLogSyncRunning) {
    return 0;
  }

  isWeightLogSyncRunning = true;

  try {
    await pushPendingWeightLogs();
    return await pullWeightLogsFromCloud();
  } finally {
    isWeightLogSyncRunning = false;
  }
}

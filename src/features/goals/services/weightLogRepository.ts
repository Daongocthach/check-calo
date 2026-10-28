import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import type { WeightLog } from '../types';

interface WeightLogRow {
  log_date: string;
  weight_kg: number;
  synced: number;
  created_at: string;
  updated_at: string;
}

export interface PendingWeightLog extends WeightLog {
  synced: boolean;
}

function mapWeightLog(row: WeightLogRow): PendingWeightLog {
  return {
    date: row.log_date,
    weightKg: row.weight_kg,
    synced: row.synced === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Weigh-ins in date order, optionally only those on or after `sinceDate`. */
export async function listWeightLogs(sinceDate?: string): Promise<WeightLog[]> {
  const database = await getDatabase();
  const rows = sinceDate
    ? await database.getAllAsync<WeightLogRow>(
        'SELECT * FROM weight_logs WHERE log_date >= ? ORDER BY log_date ASC;',
        [formatDateKey(sinceDate)]
      )
    : await database.getAllAsync<WeightLogRow>('SELECT * FROM weight_logs ORDER BY log_date ASC;');

  return rows.map(mapWeightLog);
}

export async function getWeightLog(date: string) {
  const database = await getDatabase();
  const row = await database.getFirstAsync<WeightLogRow>(
    'SELECT * FROM weight_logs WHERE log_date = ? LIMIT 1;',
    [formatDateKey(date)]
  );

  return row ? mapWeightLog(row) : null;
}

export async function getLatestWeightLog() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<WeightLogRow>(
    'SELECT * FROM weight_logs ORDER BY log_date DESC LIMIT 1;'
  );

  return row ? mapWeightLog(row) : null;
}

/** Saves the day's weigh-in, replacing an earlier one from the same day. */
export async function upsertWeightLog(
  date: string,
  weightKg: number,
  options: { synced?: boolean; createdAt?: string; updatedAt?: string } = {}
): Promise<WeightLog> {
  const database = await getDatabase();
  const now = nowIsoString();
  const logDate = formatDateKey(date);
  const createdAt = options.createdAt ?? now;
  const updatedAt = options.updatedAt ?? now;

  await database.runAsync(
    `
      INSERT INTO weight_logs (log_date, weight_kg, synced, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(log_date) DO UPDATE SET
        weight_kg = excluded.weight_kg,
        synced = excluded.synced,
        updated_at = excluded.updated_at;
    `,
    [logDate, weightKg, options.synced ? 1 : 0, createdAt, updatedAt]
  );

  return { date: logDate, weightKg, createdAt, updatedAt };
}

export async function listUnsyncedWeightLogs() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<WeightLogRow>(
    'SELECT * FROM weight_logs WHERE synced = 0 ORDER BY log_date ASC;'
  );

  return rows.map(mapWeightLog);
}

/** Marks pushed weigh-ins as synced unless they were edited again meanwhile. */
export async function markWeightLogsSynced(logs: WeightLog[]) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const log of logs) {
      await database.runAsync(
        'UPDATE weight_logs SET synced = 1 WHERE log_date = ? AND updated_at = ?;',
        [log.date, log.updatedAt]
      );
    }
  });
}

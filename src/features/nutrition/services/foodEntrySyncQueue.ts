import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from '@/services/database/sqlite';
import type { SyncQueueRecord } from '../types';
import { createEntityId, nowIsoString } from '../utils/calorie';
import { hasAuthenticatedSupabaseUser, syncFoodEntryImageToSupabase } from './foodEntryImageSync';

const FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE = 'meal_image';
const FOOD_ENTRY_IMAGE_SYNC_OPERATION = 'upload';
const DEFAULT_PRIORITY = 100;
const MAX_RETRY_DELAY_MINUTES = 30;

let isProcessingQueue = false;

export interface FoodEntrySyncQueueStatus {
  pendingCount: number;
  failedCount: number;
  processingCount: number;
  totalQueuedCount: number;
  isProcessing: boolean;
}

export interface FoodEntryImageSyncState {
  status: SyncQueueRecord['status'];
  errorMessage: string | null;
}

interface SyncQueueRow {
  id: string;
  entity_type: SyncQueueRecord['entityType'];
  entity_local_id: string;
  operation: SyncQueueRecord['operation'];
  priority: number;
  status: SyncQueueRecord['status'];
  retry_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  payload_json: string | null;
  created_at: string;
  updated_at: string;
}

function mapSyncQueueRecord(row: SyncQueueRow): SyncQueueRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityLocalId: row.entity_local_id,
    operation: row.operation,
    priority: row.priority,
    status: row.status,
    retryCount: row.retry_count,
    lastError: row.last_error,
    nextRetryAt: row.next_retry_at,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildRetryAt(retryCount: number) {
  const delayMinutes = Math.min(2 ** Math.max(retryCount - 1, 0), MAX_RETRY_DELAY_MINUTES);
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

export async function getFoodEntryImageSyncQueueStatus(): Promise<FoodEntrySyncQueueStatus> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    pending_count: number | null;
    failed_count: number | null;
    processing_count: number | null;
    total_queued_count: number | null;
  }>(
    `
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
        SUM(CASE WHEN status IN ('pending', 'failed', 'processing') THEN 1 ELSE 0 END) AS total_queued_count
      FROM sync_queue
      WHERE entity_type = ?
        AND operation = ?;
    `,
    [FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE, FOOD_ENTRY_IMAGE_SYNC_OPERATION]
  );

  return {
    pendingCount: row?.pending_count ?? 0,
    failedCount: row?.failed_count ?? 0,
    processingCount: row?.processing_count ?? 0,
    totalQueuedCount: row?.total_queued_count ?? 0,
    isProcessing: isProcessingQueue,
  };
}

export async function getFoodEntryImageSyncStateMap(entryIds: string[]) {
  if (entryIds.length === 0) {
    return {} satisfies Record<string, FoodEntryImageSyncState>;
  }

  const database = await getDatabase();
  const placeholders = entryIds.map(() => '?').join(', ');
  const rows = await database.getAllAsync<SyncQueueRow>(
    `
      SELECT *
      FROM sync_queue
      WHERE entity_type = ?
        AND operation = ?
        AND entity_local_id IN (${placeholders})
      ORDER BY created_at DESC;
    `,
    [FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE, FOOD_ENTRY_IMAGE_SYNC_OPERATION, ...entryIds]
  );

  return rows.reduce<Record<string, FoodEntryImageSyncState>>((accumulator, row) => {
    if (accumulator[row.entity_local_id]) {
      return accumulator;
    }

    accumulator[row.entity_local_id] = {
      status: row.status,
      errorMessage: row.last_error,
    };
    return accumulator;
  }, {});
}

async function getPendingFoodEntryImageJobs() {
  const database = await getDatabase();
  const now = nowIsoString();
  const rows = await database.getAllAsync<SyncQueueRow>(
    `
      SELECT *
      FROM sync_queue
      WHERE entity_type = ?
        AND operation = ?
        AND status IN ('pending', 'failed')
        AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY priority ASC, created_at ASC;
    `,
    [FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE, FOOD_ENTRY_IMAGE_SYNC_OPERATION, now]
  );

  return rows.map(mapSyncQueueRecord);
}

async function markJobAsProcessing(jobId: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE sync_queue
      SET status = 'processing', updated_at = ?, last_error = NULL
      WHERE id = ?;
    `,
    [now, jobId]
  );
}

async function markJobAsDone(jobId: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE sync_queue
      SET status = 'done', updated_at = ?, next_retry_at = NULL, last_error = NULL
      WHERE id = ?;
    `,
    [now, jobId]
  );
}

async function markJobAsPending(jobId: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE sync_queue
      SET status = 'pending', updated_at = ?
      WHERE id = ?;
    `,
    [now, jobId]
  );
}

async function markJobAsFailed(jobId: string, retryCount: number, errorMessage: string) {
  const database = await getDatabase();
  const now = nowIsoString();

  await database.runAsync(
    `
      UPDATE sync_queue
      SET
        status = 'failed',
        retry_count = ?,
        last_error = ?,
        next_retry_at = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    [retryCount, errorMessage, buildRetryAt(retryCount), now, jobId]
  );
}

export async function enqueueFoodEntryImageSync(entryId: string) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existingJob = await database.getFirstAsync<{
    id: string;
    status: SyncQueueRecord['status'];
  }>(
    `
      SELECT id, status
      FROM sync_queue
      WHERE entity_type = ?
        AND operation = ?
        AND entity_local_id = ?
        AND status IN ('pending', 'processing', 'failed');
    `,
    [FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE, FOOD_ENTRY_IMAGE_SYNC_OPERATION, entryId]
  );

  if (existingJob) {
    if (existingJob.status === 'failed') {
      await markJobAsPending(existingJob.id);
    }

    return existingJob.id;
  }

  const jobId = createEntityId('sync-job');
  await database.runAsync(
    `
      INSERT INTO sync_queue (
        id,
        entity_type,
        entity_local_id,
        operation,
        priority,
        status,
        retry_count,
        last_error,
        next_retry_at,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, ?, ?);
    `,
    [
      jobId,
      FOOD_ENTRY_IMAGE_SYNC_ENTITY_TYPE,
      entryId,
      FOOD_ENTRY_IMAGE_SYNC_OPERATION,
      DEFAULT_PRIORITY,
      now,
      now,
    ]
  );

  return jobId;
}

export async function processPendingFoodEntryImageSyncQueue() {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  try {
    const networkState = await NetInfo.fetch();
    const isOnline = Boolean(
      networkState.isConnected && networkState.isInternetReachable !== false
    );

    if (!isOnline) {
      return;
    }

    const hasAuthenticatedUser = await hasAuthenticatedSupabaseUser();

    if (!hasAuthenticatedUser) {
      return;
    }

    const jobs = await getPendingFoodEntryImageJobs();

    for (const job of jobs) {
      await markJobAsProcessing(job.id);

      try {
        const wasSynced = await syncFoodEntryImageToSupabase(job.entityLocalId);

        if (!wasSynced) {
          await markJobAsPending(job.id);
          continue;
        }

        await markJobAsDone(job.id);
      } catch (error) {
        const nextRetryCount = job.retryCount + 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        await markJobAsFailed(job.id, nextRetryCount, errorMessage);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

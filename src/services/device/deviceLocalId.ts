import { createEntityId, nowIsoString } from '@/features/nutrition/utils/calorie';
import { STORAGE_KEYS, getItem, setItem } from '@/utils/storage';
import { getDatabase } from '../database/sqlite';

type DeviceLocalIdResult = {
  deviceLocalId: string;
  createdAt: string;
};

export async function ensureDeviceLocalId(): Promise<DeviceLocalIdResult> {
  const storedValue = getItem<string>(STORAGE_KEYS.device.localId);
  const existingDeviceLocalId = storedValue.success ? storedValue.data : null;

  if (existingDeviceLocalId) {
    return upsertAppDevice(existingDeviceLocalId, false);
  }

  const deviceLocalId = createEntityId('device');
  const saveResult = setItem(STORAGE_KEYS.device.localId, deviceLocalId);

  if (!saveResult.success) {
    throw saveResult.error ?? new Error('Failed to persist device local id');
  }

  return upsertAppDevice(deviceLocalId, true);
}

async function upsertAppDevice(deviceLocalId: string, isNewRecord: boolean) {
  const database = await getDatabase();
  const now = nowIsoString();
  const createdAt = isNewRecord
    ? now
    : ((await getDeviceCreatedAt(database, deviceLocalId)) ?? now);

  await database.runAsync(
    `
      INSERT INTO app_device (id, created_at, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        updated_at = excluded.updated_at;
    `,
    [deviceLocalId, createdAt, now]
  );

  return { deviceLocalId, createdAt };
}

async function getDeviceCreatedAt(
  database: Awaited<ReturnType<typeof getDatabase>>,
  deviceLocalId: string
) {
  const row = await database.getFirstAsync<{ created_at: string }>(
    'SELECT created_at FROM app_device WHERE id = ? LIMIT 1;',
    [deviceLocalId]
  );

  return row?.created_at ?? null;
}

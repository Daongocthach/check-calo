import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

const DATABASE_NAME = 'check-calo.db';
const DATABASE_VERSION = MIGRATIONS.length;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function createDatabase() {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}

/**
 * Runs `task` in a transaction once every earlier one has finished. The app shares one
 * connection, so two `withTransactionAsync` calls at once would nest their BEGINs and one
 * COMMIT or ROLLBACK would end the other's transaction. Never call it from inside `task`:
 * it would wait for itself.
 */
export function withWriteTransaction(
  database: SQLite.SQLiteDatabase,
  task: () => Promise<void>
): Promise<void> {
  const run = writeQueue.then(() => database.withTransactionAsync(task));
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function initializeDatabase() {
  const database = await getDatabase();
  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  for (let version = currentVersion + 1; version <= DATABASE_VERSION; version += 1) {
    await MIGRATIONS[version - 1](database);
  }

  if (currentVersion < DATABASE_VERSION) {
    await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
  } else {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);
  }

  return database;
}

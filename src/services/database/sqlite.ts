import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'check-calo.db';
const DATABASE_VERSION = 2;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createDatabase() {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}

async function runVersion1Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      gender TEXT NOT NULL,
      age INTEGER NOT NULL,
      height_cm REAL NOT NULL,
      weight_kg REAL NOT NULL,
      activity_level TEXT NOT NULL,
      activity_factor REAL NOT NULL,
      bmi REAL NOT NULL,
      daily_calorie_target INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_calorie_targets (
      date TEXT PRIMARY KEY NOT NULL,
      calorie_target INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'profile',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY NOT NULL,
      entry_date TEXT NOT NULL,
      consumed_at TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      quantity_label TEXT NOT NULL,
      quantity_grams REAL,
      total_calories REAL NOT NULL,
      protein_grams REAL NOT NULL,
      carbs_grams REAL NOT NULL,
      fat_grams REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_foods (
      id TEXT PRIMARY KEY NOT NULL,
      source_entry_id TEXT UNIQUE,
      name TEXT NOT NULL,
      quantity_label TEXT NOT NULL,
      quantity_grams REAL,
      total_calories REAL NOT NULL,
      protein_grams REAL NOT NULL,
      carbs_grams REAL NOT NULL,
      fat_grams REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_food_entries_entry_date
      ON food_entries(entry_date);

    CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at
      ON food_entries(consumed_at);

    CREATE INDEX IF NOT EXISTS idx_favorite_foods_name
      ON favorite_foods(name);
  `);
}

async function runVersion2Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE food_entries ADD COLUMN image_uri TEXT;
    ALTER TABLE favorite_foods ADD COLUMN image_uri TEXT;
  `);
}

export async function initializeDatabase() {
  const database = await getDatabase();
  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await runVersion1Migration(database);
  }

  if (currentVersion < 2) {
    await runVersion2Migration(database);
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

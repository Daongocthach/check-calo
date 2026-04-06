import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'check-calo.db';
const DATABASE_VERSION = 5;

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

async function runVersion3Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_device (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      local_id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('device', 'user')),
      device_local_id TEXT NOT NULL,
      user_id TEXT,
      meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
      note TEXT,
      eaten_at TEXT NOT NULL,
      total_calories REAL NOT NULL DEFAULT 0,
      total_protein_grams REAL NOT NULL DEFAULT 0,
      total_carbs_grams REAL NOT NULL DEFAULT 0,
      total_fat_grams REAL NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL CHECK (
        sync_status IN ('local_only', 'pending', 'syncing', 'synced', 'failed')
      ),
      sync_error TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_images (
      local_id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      meal_local_id TEXT NOT NULL,
      meal_remote_id TEXT,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('device', 'user')),
      device_local_id TEXT NOT NULL,
      user_id TEXT,
      local_uri TEXT,
      thumbnail_uri TEXT,
      remote_path TEXT,
      mime_type TEXT,
      file_name TEXT,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      taken_at TEXT,
      upload_status TEXT NOT NULL CHECK (
        upload_status IN ('local_only', 'pending', 'uploading', 'uploaded', 'failed', 'deleted_local')
      ),
      upload_error TEXT,
      last_uploaded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (meal_local_id) REFERENCES meals(local_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meal_items (
      local_id TEXT PRIMARY KEY NOT NULL,
      remote_id TEXT,
      meal_local_id TEXT NOT NULL,
      meal_remote_id TEXT,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('device', 'user')),
      device_local_id TEXT NOT NULL,
      user_id TEXT,
      source_key TEXT,
      title TEXT NOT NULL,
      quantity_label TEXT NOT NULL,
      quantity_grams REAL,
      servings REAL NOT NULL DEFAULT 1,
      total_calories REAL NOT NULL DEFAULT 0,
      protein_grams REAL NOT NULL DEFAULT 0,
      carbs_grams REAL NOT NULL DEFAULT 0,
      fat_grams REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (meal_local_id) REFERENCES meals(local_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL CHECK (
        entity_type IN ('meal', 'meal_item', 'meal_image', 'delete_meal', 'delete_meal_image')
      ),
      entity_local_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (
        operation IN ('create', 'update', 'delete', 'upload')
      ),
      priority INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL CHECK (
        status IN ('pending', 'processing', 'done', 'failed')
      ),
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_retry_at TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meals_device_local_id
      ON meals(device_local_id);

    CREATE INDEX IF NOT EXISTS idx_meals_user_id
      ON meals(user_id);

    CREATE INDEX IF NOT EXISTS idx_meals_sync_status
      ON meals(sync_status);

    CREATE INDEX IF NOT EXISTS idx_meals_eaten_at
      ON meals(eaten_at DESC);

    CREATE INDEX IF NOT EXISTS idx_meal_images_meal_local_id
      ON meal_images(meal_local_id);

    CREATE INDEX IF NOT EXISTS idx_meal_images_device_local_id
      ON meal_images(device_local_id);

    CREATE INDEX IF NOT EXISTS idx_meal_images_user_id
      ON meal_images(user_id);

    CREATE INDEX IF NOT EXISTS idx_meal_images_upload_status
      ON meal_images(upload_status);

    CREATE INDEX IF NOT EXISTS idx_meal_items_meal_local_id
      ON meal_items(meal_local_id);

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status_priority
      ON sync_queue(status, priority, created_at);
  `);
}

async function runVersion4Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE food_entries ADD COLUMN thumbnail_uri TEXT;
    ALTER TABLE favorite_foods ADD COLUMN thumbnail_uri TEXT;
  `);
}

async function runVersion5Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    ALTER TABLE user_profile ADD COLUMN desired_weight_kg REAL NOT NULL DEFAULT 0;
    ALTER TABLE user_profile ADD COLUMN maintenance_calorie_target INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE user_profile ADD COLUMN protein_target_grams REAL NOT NULL DEFAULT 0;
    ALTER TABLE user_profile ADD COLUMN carbs_target_grams REAL NOT NULL DEFAULT 0;
    ALTER TABLE user_profile ADD COLUMN fat_target_grams REAL NOT NULL DEFAULT 0;

    UPDATE user_profile
    SET
      desired_weight_kg = CASE
        WHEN desired_weight_kg <= 0 THEN weight_kg
        ELSE desired_weight_kg
      END,
      maintenance_calorie_target = CASE
        WHEN maintenance_calorie_target <= 0 THEN daily_calorie_target
        ELSE maintenance_calorie_target
      END,
      protein_target_grams = CASE
        WHEN protein_target_grams <= 0 THEN ROUND(MAX(weight_kg * 1.8, 60))
        ELSE protein_target_grams
      END,
      fat_target_grams = CASE
        WHEN fat_target_grams <= 0 THEN ROUND(MAX(weight_kg * 0.8, (daily_calorie_target * 0.25) / 9))
        ELSE fat_target_grams
      END,
      carbs_target_grams = CASE
        WHEN carbs_target_grams <= 0 THEN MAX(
          0,
          ROUND(
            (
              daily_calorie_target
              - ROUND(MAX(weight_kg * 1.8, 60)) * 4
              - ROUND(MAX(weight_kg * 0.8, (daily_calorie_target * 0.25) / 9)) * 9
            ) / 4
          )
        )
        ELSE carbs_target_grams
      END;
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

  if (currentVersion < 3) {
    await runVersion3Migration(database);
  }

  if (currentVersion < 4) {
    await runVersion4Migration(database);
  }

  if (currentVersion < 5) {
    await runVersion5Migration(database);
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

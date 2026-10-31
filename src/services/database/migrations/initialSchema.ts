import type * as SQLite from 'expo-sqlite';
import { addColumnIfMissing } from './helpers';

export async function runVersion1Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      display_name TEXT NOT NULL DEFAULT '',
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
      user_id TEXT,
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

    CREATE TABLE IF NOT EXISTS recent_foods (
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

    CREATE INDEX IF NOT EXISTS idx_food_entries_user_id
      ON food_entries(user_id);

    CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at
      ON food_entries(consumed_at);

    CREATE INDEX IF NOT EXISTS idx_recent_foods_name
      ON recent_foods(name);
  `);
}

export async function runVersion2Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'food_entries', 'image_uri', 'image_uri TEXT');
  await addColumnIfMissing(database, 'recent_foods', 'image_uri', 'image_uri TEXT');
}

export async function runVersion3Migration(database: SQLite.SQLiteDatabase) {
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
      image_uri TEXT,
      thumbnail_uri TEXT,
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

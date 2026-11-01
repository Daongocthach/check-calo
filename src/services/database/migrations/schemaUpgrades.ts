import type * as SQLite from 'expo-sqlite';
import { addColumnIfMissing } from './helpers';

export async function runVersion4Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'food_entries', 'thumbnail_uri', 'thumbnail_uri TEXT');
  await addColumnIfMissing(database, 'recent_foods', 'thumbnail_uri', 'thumbnail_uri TEXT');
}

export async function runVersion5Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(
    database,
    'user_profile',
    'desired_weight_kg',
    'desired_weight_kg REAL NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    database,
    'user_profile',
    'maintenance_calorie_target',
    'maintenance_calorie_target INTEGER NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    database,
    'user_profile',
    'protein_target_grams',
    'protein_target_grams REAL NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    database,
    'user_profile',
    'carbs_target_grams',
    'carbs_target_grams REAL NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(
    database,
    'user_profile',
    'fat_target_grams',
    'fat_target_grams REAL NOT NULL DEFAULT 0'
  );

  await database.execAsync(`
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

export async function runVersion6Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(
    database,
    'user_profile',
    'monthly_weight_loss_kg',
    'monthly_weight_loss_kg REAL NOT NULL DEFAULT 0'
  );

  await database.execAsync(`
    UPDATE user_profile
    SET monthly_weight_loss_kg = CASE
      WHEN desired_weight_kg < weight_kg
        THEN ROUND(((weight_kg - desired_weight_kg) * 30 / 42) * 10) / 10
      ELSE 0
    END;
  `);
}

export async function runVersion7Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS weight_goals (
      id TEXT PRIMARY KEY NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('lose', 'gain', 'maintain')),
      target_kg REAL,
      target_kcal_delta INTEGER NOT NULL DEFAULT 0,
      target_days INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weight_goals_status_started_at
      ON weight_goals(status, started_at DESC);

    CREATE TABLE IF NOT EXISTS achievement_unlocks (
      id TEXT PRIMARY KEY NOT NULL,
      achievement_key TEXT NOT NULL UNIQUE,
      unlocked_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export async function runVersion8Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'meal_items', 'image_uri', 'image_uri TEXT');
  await addColumnIfMissing(database, 'meal_items', 'thumbnail_uri', 'thumbnail_uri TEXT');
}

export async function runVersion9Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'food_entries', 'barcode', 'barcode TEXT');
  await addColumnIfMissing(database, 'recent_foods', 'barcode', 'barcode TEXT');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS food_products (
      id TEXT PRIMARY KEY NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      quantity_label TEXT NOT NULL,
      quantity_grams REAL,
      total_calories REAL NOT NULL,
      protein_grams REAL NOT NULL,
      carbs_grams REAL NOT NULL,
      fat_grams REAL NOT NULL,
      notes TEXT,
      image_uri TEXT,
      source TEXT NOT NULL CHECK (source IN ('user', 'openfoodfacts', 'admin')),
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_food_entries_barcode
      ON food_entries(barcode);

    CREATE INDEX IF NOT EXISTS idx_recent_foods_barcode
      ON recent_foods(barcode);

    CREATE INDEX IF NOT EXISTS idx_food_products_barcode
      ON food_products(barcode);
  `);
}

export async function runVersion10Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(
    database,
    'user_profile',
    'display_name',
    "display_name TEXT NOT NULL DEFAULT ''"
  );
}

export async function runVersion11Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'food_entries', 'user_id', 'user_id TEXT');

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_food_entries_user_id
      ON food_entries(user_id);
  `);
}

export async function runVersion13Migration(database: SQLite.SQLiteDatabase) {
  // Check if favorite_foods exists and rename to recent_foods
  const favoriteFoodsTable = await database.getAllAsync<{ name: string }>(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='favorite_foods';
  `);

  if (favoriteFoodsTable.length > 0) {
    await database.execAsync(`
      ALTER TABLE favorite_foods RENAME TO recent_foods;
    `);
  } else {
    // If neither favorite_foods nor recent_foods exists, create recent_foods
    const recentFoodsTable = await database.getAllAsync<{ name: string }>(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='recent_foods';
    `);

    if (recentFoodsTable.length === 0) {
      await database.execAsync(`
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
      `);
    }
  }

  // Ensure indices and columns for recent_foods
  await addColumnIfMissing(database, 'recent_foods', 'image_uri', 'image_uri TEXT');
  await addColumnIfMissing(database, 'recent_foods', 'thumbnail_uri', 'thumbnail_uri TEXT');
  await addColumnIfMissing(database, 'recent_foods', 'barcode', 'barcode TEXT');

  await database.execAsync(`
    DROP INDEX IF EXISTS idx_recent_foods_name;
    DROP INDEX IF EXISTS idx_recent_foods_barcode;
    CREATE INDEX IF NOT EXISTS idx_recent_foods_name ON recent_foods(name);
    CREATE INDEX IF NOT EXISTS idx_recent_foods_barcode ON recent_foods(barcode);
  `);
}

// Additive, idempotent indexes for hot read paths; no data or schema changes.
export async function runVersion14Migration(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
      ON sync_queue(entity_type, operation, entity_local_id);
    CREATE INDEX IF NOT EXISTS idx_recent_foods_updated_at
      ON recent_foods(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recent_foods_name_nocase
      ON recent_foods(name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_food_entries_entry_date_consumed_at
      ON food_entries(entry_date, consumed_at);
  `);
}

// Nullable so entries logged before this version read as "unknown" instead of 0.
const NUTRIENT_COLUMN_DEFINITIONS = [
  'fiber_grams REAL',
  'sugar_grams REAL',
  'saturated_fat_grams REAL',
  'trans_fat_grams REAL',
  'cholesterol_mg REAL',
  'sodium_mg REAL',
  'potassium_mg REAL',
];

export async function runVersion15Migration(database: SQLite.SQLiteDatabase) {
  for (const tableName of ['food_entries', 'recent_foods', 'food_products']) {
    for (const columnDefinition of NUTRIENT_COLUMN_DEFINITIONS) {
      const [columnName] = columnDefinition.split(' ');
      await addColumnIfMissing(database, tableName, columnName, columnDefinition);
    }
  }
}

export async function runVersion16Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'user_profile', 'target_weight_kg', 'target_weight_kg REAL');
  await addColumnIfMissing(database, 'weight_goals', 'start_weight_kg', 'start_weight_kg REAL');
  await addColumnIfMissing(database, 'weight_goals', 'target_weight_kg', 'target_weight_kg REAL');
  await addColumnIfMissing(database, 'weight_goals', 'monthly_rate_kg', 'monthly_rate_kg REAL');

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      log_date TEXT PRIMARY KEY NOT NULL,
      weight_kg REAL NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Days keep the target and goal they were logged under. Days already logged are frozen at
 * the current profile, which is what they were judged by until now.
 */
export async function runVersion17Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'daily_calorie_targets', 'goal_mode', 'goal_mode TEXT');

  const now = new Date().toISOString();
  await database.runAsync(
    `
      INSERT OR IGNORE INTO daily_calorie_targets
        (date, calorie_target, source, goal_mode, created_at, updated_at)
      SELECT DISTINCT
        food_entries.entry_date,
        user_profile.daily_calorie_target,
        'profile',
        CASE
          WHEN user_profile.monthly_weight_loss_kg > 0 THEN 'lose'
          WHEN user_profile.monthly_weight_loss_kg < 0 THEN 'gain'
          ELSE 'maintain'
        END,
        ?,
        ?
      FROM food_entries
      JOIN user_profile ON user_profile.id = 1
      WHERE food_entries.entry_date IS NOT NULL;
    `,
    [now, now]
  );
}

/** Last day of the maintenance phase after switching between losing and gaining. */
export async function runVersion18Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'user_profile', 'transition_until', 'transition_until TEXT');
}

/**
 * When a goal stopped, whether reached, changed or ended. Goals that already stopped only
 * kept it as their completion or last update time.
 */
export async function runVersion19Migration(database: SQLite.SQLiteDatabase) {
  await addColumnIfMissing(database, 'weight_goals', 'ended_at', 'ended_at TEXT');

  await database.execAsync(`
    UPDATE weight_goals
    SET ended_at = COALESCE(completed_at, updated_at)
    WHERE status != 'active' AND ended_at IS NULL;
  `);
}

/**
 * Day plans keep their macro targets and, like weight goals, a sync state for the cloud copy.
 * Plans saved before this version get the current profile's macros, which is what they were
 * judged by until now, and are pushed without overwriting a copy another device already sent.
 */
export async function runVersion20Migration(database: SQLite.SQLiteDatabase) {
  for (const columnDefinition of [
    'protein_target_grams REAL',
    'carbs_target_grams REAL',
    'fat_target_grams REAL',
  ]) {
    const [columnName] = columnDefinition.split(' ');
    await addColumnIfMissing(database, 'daily_calorie_targets', columnName, columnDefinition);
  }
  await addColumnIfMissing(
    database,
    'daily_calorie_targets',
    'synced',
    'synced INTEGER NOT NULL DEFAULT 0'
  );
  await addColumnIfMissing(database, 'weight_goals', 'synced', 'synced INTEGER NOT NULL DEFAULT 0');

  await database.execAsync(`
    UPDATE daily_calorie_targets
    SET
      protein_target_grams = (SELECT protein_target_grams FROM user_profile WHERE id = 1),
      carbs_target_grams = (SELECT carbs_target_grams FROM user_profile WHERE id = 1),
      fat_target_grams = (SELECT fat_target_grams FROM user_profile WHERE id = 1),
      synced = 2
    WHERE protein_target_grams IS NULL;
  `);
}

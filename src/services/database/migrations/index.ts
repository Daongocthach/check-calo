import type * as SQLite from 'expo-sqlite';
import { runVersion1Migration, runVersion2Migration, runVersion3Migration } from './initialSchema';
import {
  runVersion4Migration,
  runVersion5Migration,
  runVersion6Migration,
  runVersion7Migration,
  runVersion8Migration,
  runVersion9Migration,
  runVersion10Migration,
  runVersion11Migration,
  runVersion13Migration,
  runVersion14Migration,
  runVersion15Migration,
  runVersion16Migration,
  runVersion17Migration,
  runVersion18Migration,
  runVersion19Migration,
  runVersion20Migration,
} from './schemaUpgrades';

type Migration = (database: SQLite.SQLiteDatabase) => Promise<void>;

// Migration 12 was replaced by 13 due to table rename issues
const skippedMigration: Migration = async () => {};

/** Ordered schema migrations: entry `i` upgrades the database to version `i + 1`. */
export const MIGRATIONS: readonly Migration[] = [
  runVersion1Migration,
  runVersion2Migration,
  runVersion3Migration,
  runVersion4Migration,
  runVersion5Migration,
  runVersion6Migration,
  runVersion7Migration,
  runVersion8Migration,
  runVersion9Migration,
  runVersion10Migration,
  runVersion11Migration,
  skippedMigration,
  runVersion13Migration,
  runVersion14Migration,
  runVersion15Migration,
  runVersion16Migration,
  runVersion17Migration,
  runVersion18Migration,
  runVersion19Migration,
  runVersion20Migration,
];

import { describe, expect, it, jest } from '@jest/globals';
import type { SQLiteDatabase } from 'expo-sqlite';
import { withWriteTransaction } from './sqlite';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('./migrations', () => ({ MIGRATIONS: [] }));

function createDatabase(log: string[]) {
  const database = {
    withTransactionAsync: async (task: () => Promise<void>) => {
      log.push('BEGIN');
      try {
        await task();
        log.push('COMMIT');
      } catch (error) {
        log.push('ROLLBACK');
        throw error;
      }
    },
  };

  return database as unknown as SQLiteDatabase;
}

function tick() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('withWriteTransaction', () => {
  it('starts a transaction only after the previous one has ended', async () => {
    const log: string[] = [];
    const database = createDatabase(log);

    await Promise.all([
      withWriteTransaction(database, async () => {
        await tick();
        log.push('first');
      }),
      withWriteTransaction(database, async () => {
        log.push('second');
      }),
    ]);

    expect(log).toEqual(['BEGIN', 'first', 'COMMIT', 'BEGIN', 'second', 'COMMIT']);
  });

  it('keeps going after a transaction fails', async () => {
    const log: string[] = [];
    const database = createDatabase(log);

    const failed = withWriteTransaction(database, async () => {
      await tick();
      throw new Error('write failed');
    });
    const next = withWriteTransaction(database, async () => {
      log.push('next');
    });

    await expect(failed).rejects.toThrow('write failed');
    await next;

    expect(log).toEqual(['BEGIN', 'ROLLBACK', 'BEGIN', 'next', 'COMMIT']);
  });
});

import { getDatabase } from '@/services/database/sqlite';
import { nowIsoString } from '@/utils/date';
import type { QuestCompletion } from '../types';

interface QuestCompletionRow {
  quest_id: string;
  period_key: string;
  points: number;
  completed_at: string;
  synced: number;
}

function mapCompletion(row: QuestCompletionRow): QuestCompletion {
  return {
    questId: row.quest_id,
    periodKey: row.period_key,
    points: row.points,
    completedAt: row.completed_at,
  };
}

export async function listQuestCompletions() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<QuestCompletionRow>(
    'SELECT * FROM buddy_quest_completions ORDER BY completed_at ASC;'
  );

  return rows.map(mapCompletion);
}

/** Records completions not recorded yet; returns the ones that were new. */
export async function recordQuestCompletions(
  completions: Omit<QuestCompletion, 'completedAt'>[]
): Promise<QuestCompletion[]> {
  const database = await getDatabase();
  const completedAt = nowIsoString();
  const recorded: QuestCompletion[] = [];

  await database.withTransactionAsync(async () => {
    for (const completion of completions) {
      const result = await database.runAsync(
        `
          INSERT OR IGNORE INTO buddy_quest_completions
            (quest_id, period_key, points, completed_at, synced)
          VALUES (?, ?, ?, ?, 0);
        `,
        [completion.questId, completion.periodKey, completion.points, completedAt]
      );

      if (result.changes > 0) {
        recorded.push({ ...completion, completedAt });
      }
    }
  });

  return recorded;
}

/** Completions not pushed to the cloud yet. */
export async function listPendingQuestCompletions() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<QuestCompletionRow>(
    'SELECT * FROM buddy_quest_completions WHERE synced = 0 ORDER BY completed_at ASC;'
  );

  return rows.map(mapCompletion);
}

/** Marks a pushed completion synced, keeping the points the cloud stored for it. */
export async function markQuestCompletionSynced(
  completion: Pick<QuestCompletion, 'questId' | 'periodKey'>,
  points: number
) {
  const database = await getDatabase();

  await database.runAsync(
    `
      UPDATE buddy_quest_completions
      SET synced = 1, points = ?
      WHERE quest_id = ? AND period_key = ?;
    `,
    [points, completion.questId, completion.periodKey]
  );
}

/** Drops a completion the cloud refused for good (an unknown quest or a period too old). */
export async function deleteQuestCompletion(
  completion: Pick<QuestCompletion, 'questId' | 'periodKey'>
) {
  const database = await getDatabase();

  await database.runAsync(
    'DELETE FROM buddy_quest_completions WHERE quest_id = ? AND period_key = ?;',
    [completion.questId, completion.periodKey]
  );
}

/**
 * Saves completions pulled from the cloud and returns how many changed. A completion not
 * pushed yet stays; with `replace`, every local completion is dropped first.
 */
export async function applyCloudQuestCompletions(
  completions: QuestCompletion[],
  { replace = false }: { replace?: boolean } = {}
) {
  const database = await getDatabase();
  let changed = 0;

  await database.withTransactionAsync(async () => {
    if (replace) {
      await database.runAsync('DELETE FROM buddy_quest_completions;');
    }

    for (const completion of completions) {
      const result = await database.runAsync(
        `
          INSERT INTO buddy_quest_completions
            (quest_id, period_key, points, completed_at, synced)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(quest_id, period_key) DO UPDATE SET
            points = excluded.points,
            completed_at = excluded.completed_at,
            synced = 1
          WHERE buddy_quest_completions.points != excluded.points
            OR buddy_quest_completions.synced = 0;
        `,
        [completion.questId, completion.periodKey, completion.points, completion.completedAt]
      );
      changed += result.changes;
    }
  });

  return changed;
}

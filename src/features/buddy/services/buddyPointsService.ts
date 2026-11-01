import { getActivityStats } from '@/features/achievements/services/activityStatsService';
import { getDatabase } from '@/services/database/sqlite';
import { LEGACY_QUEST_ID } from '../constants/quests';
import { calculateLegacyPoints } from '../utils/buddyProgress';
import { recordQuestCompletions } from './questCompletionRepository';

/**
 * Records, once, the points the diary earned under the rules before quests, so switching to
 * quests never costs a level. A device that already got them from the cloud skips this.
 */
async function ensureLegacyPoints() {
  const database = await getDatabase();
  const legacy = await database.getFirstAsync<{ points: number }>(
    'SELECT points FROM buddy_quest_completions WHERE quest_id = ? LIMIT 1;',
    [LEGACY_QUEST_ID]
  );

  if (legacy) {
    return;
  }

  const points = calculateLegacyPoints(await getActivityStats());
  await recordQuestCompletions([{ questId: LEGACY_QUEST_ID, periodKey: LEGACY_QUEST_ID, points }]);
}

/** Buddy's points: the starting points plus every quest completed. */
export async function getBuddyPoints() {
  await ensureLegacyPoints();

  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(points) AS total FROM buddy_quest_completions;'
  );

  return row?.total ?? 0;
}

/** When quests replaced the old rules on this account; null before it happened. */
export async function getQuestSwitchTime() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ completed_at: string }>(
    'SELECT completed_at FROM buddy_quest_completions WHERE quest_id = ? LIMIT 1;',
    [LEGACY_QUEST_ID]
  );

  return row?.completed_at ?? null;
}

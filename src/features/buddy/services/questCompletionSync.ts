import { supabase } from '@/integrations/supabase';
import { LEGACY_QUEST_ID } from '../constants/quests';
import type { QuestCompletion } from '../types';
import {
  applyCloudQuestCompletions,
  deleteQuestCompletion,
  listPendingQuestCompletions,
  markQuestCompletionSynced,
} from './questCompletionRepository';

interface SupabaseQuestCompletionRow {
  quest_id: string;
  period_key: string;
  points: number;
  completed_at: string;
}

const TABLE = 'buddy_quest_completions';
/** The cloud refused the completion for good (unknown quest, period too old). */
const INVALID_COMPLETION_CODE = '22023';
// PostgREST caps a response at 1000 rows by default; a daily quest adds a row a day.
const PAGE_SIZE = 1000;

let isQuestSyncRunning = false;

async function getSessionUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Postgres returns `+00:00` timestamps; local rows keep ISO strings. */
function toIsoString(value: string) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

async function pushCompletion(completion: QuestCompletion) {
  const { data, error } =
    completion.questId === LEGACY_QUEST_ID
      ? await supabase.rpc('claim_buddy_legacy_points', { p_points: completion.points })
      : await supabase.rpc('complete_buddy_quest', {
          p_quest_id: completion.questId,
          p_period_key: completion.periodKey,
        });

  if (error) {
    if (error.code === INVALID_COMPLETION_CODE) {
      await deleteQuestCompletion(completion);
    } else if (__DEV__) {
      console.warn('[QuestSync] Failed to push a completion:', error.message);
    }
    return;
  }

  // The cloud decides the points: the quest's points there, or the first device's legacy claim.
  await markQuestCompletionSynced(completion, typeof data === 'number' ? data : completion.points);
}

/** Pushes completions recorded while offline (or before sign-in). */
export async function pushPendingQuestCompletions() {
  if (!(await getSessionUserId())) {
    return;
  }

  for (const completion of await listPendingQuestCompletions()) {
    await pushCompletion(completion);
  }
}

async function fetchCloudCompletions() {
  const rows: SupabaseQuestCompletionRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('quest_id, period_key, points, completed_at')
      .order('completed_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<SupabaseQuestCompletionRow[]>();

    if (error || !data) {
      if (__DEV__) {
        console.warn('[QuestSync] Failed to pull completions:', error?.message);
      }
      return null;
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/**
 * Pulls cloud completions and returns how many local ones changed. With `replace` (after
 * signing in), they replace the local ones; an account with none keeps the local ones.
 */
export async function pullQuestCompletionsFromCloud({
  replace = false,
}: { replace?: boolean } = {}) {
  if (!(await getSessionUserId())) {
    return 0;
  }

  const rows = await fetchCloudCompletions();

  if (!rows || rows.length === 0) {
    return 0;
  }

  return applyCloudQuestCompletions(
    rows.map((row) => ({
      questId: row.quest_id,
      periodKey: row.period_key,
      points: row.points,
      completedAt: toIsoString(row.completed_at),
    })),
    { replace }
  );
}

export async function syncQuestCompletions() {
  if (isQuestSyncRunning) {
    return 0;
  }

  isQuestSyncRunning = true;

  try {
    await pushPendingQuestCompletions();
    return await pullQuestCompletionsFromCloud();
  } finally {
    isQuestSyncRunning = false;
  }
}

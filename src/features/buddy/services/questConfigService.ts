import Ionicons from '@expo/vector-icons/Ionicons';
import { env } from '@/config/env';
import type { WeightGoalMode } from '@/features/goals/types';
import { supabase } from '@/integrations/supabase';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import { DEFAULT_QUESTS, QUEST_KINDS, QUEST_METRICS } from '../constants/quests';
import type { BuddyQuest, IoniconName, QuestKind, QuestMetric } from '../types';

interface BuddyQuestRow {
  id: string;
  kind: string;
  metric: string;
  required_days: number | null;
  goal_modes: string[] | null;
  points: number;
  title: unknown;
  icon: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

const FALLBACK_ICON: IoniconName = 'star';
const GOAL_MODES: readonly WeightGoalMode[] = ['lose', 'gain', 'maintain'];

function isQuestKind(value: string): value is QuestKind {
  return QUEST_KINDS.some((kind) => kind === value);
}

function isQuestMetric(value: string): value is QuestMetric {
  return QUEST_METRICS.some((metric) => metric === value);
}

function isGoalMode(value: string): value is WeightGoalMode {
  return GOAL_MODES.some((mode) => mode === value);
}

function isIoniconName(value: string | null): value is IoniconName {
  return value !== null && value in Ionicons.glyphMap;
}

function toTitle(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
  );

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/** A row the app can show, or null for one it cannot (unknown kind or metric, no title). */
function toQuest(row: BuddyQuestRow): BuddyQuest | null {
  const title = toTitle(row.title);

  if (!isQuestKind(row.kind) || !isQuestMetric(row.metric) || !title) {
    return null;
  }

  return {
    id: row.id,
    kind: row.kind,
    metric: row.metric,
    requiredDays: row.required_days ?? (row.kind === 'weekly' ? 7 : 1),
    goalModes: row.goal_modes ? row.goal_modes.filter(isGoalMode) : null,
    points: row.points,
    title,
    icon: isIoniconName(row.icon) ? row.icon : FALLBACK_ICON,
    sortOrder: row.sort_order,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

/** The quest list saved from the last fetch, else the built-in one. */
export function getCachedQuests(): BuddyQuest[] {
  const cached = getItem<BuddyQuest[]>(STORAGE_KEYS.app.buddyQuestConfig);
  return cached.success && Array.isArray(cached.data) ? cached.data : DEFAULT_QUESTS;
}

/** Active quests from Supabase, saved for offline use; the cached list when that fails. */
export async function fetchBuddyQuests(): Promise<BuddyQuest[]> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return DEFAULT_QUESTS;
  }

  const { data, error } = await supabase
    .from('buddy_quests')
    .select(
      'id, kind, metric, required_days, goal_modes, points, title, icon, sort_order, starts_at, ends_at'
    )
    .eq('is_active', true)
    .returns<BuddyQuestRow[]>();

  if (error || !data) {
    if (__DEV__) {
      console.warn('[BuddyQuests] Failed to load quests:', error?.message);
    }
    return getCachedQuests();
  }

  const quests = data
    .map(toQuest)
    .filter((quest): quest is BuddyQuest => quest !== null)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  // An empty table is more likely a migration not run yet than "no quests at all".
  if (quests.length === 0) {
    return getCachedQuests();
  }

  setItem(STORAGE_KEYS.app.buddyQuestConfig, quests);
  return quests;
}

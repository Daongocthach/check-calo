import { formatDateKey } from '@/utils/date';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';

let cachedRangeRulesSince: string | null = null;

/**
 * First day judged by the calorie range rules, fixed the first time this install asks.
 * Earlier days keep the old rules so buddy points and achievements never drop.
 */
export function getRangeRulesSince() {
  if (cachedRangeRulesSince) {
    return cachedRangeRulesSince;
  }

  const stored = getItem<string>(STORAGE_KEYS.app.goalRangeRulesSince);

  if (stored.success && typeof stored.data === 'string') {
    cachedRangeRulesSince = stored.data;
    return cachedRangeRulesSince;
  }

  cachedRangeRulesSince = formatDateKey(new Date());
  setItem(STORAGE_KEYS.app.goalRangeRulesSince, cachedRangeRulesSince);
  return cachedRangeRulesSince;
}

export function usesLegacyGoalRules(dateKey: string) {
  return formatDateKey(dateKey) < getRangeRulesSince();
}

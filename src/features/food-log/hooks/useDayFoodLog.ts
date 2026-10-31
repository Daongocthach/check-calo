import { formatDateKey } from '@/utils/date';
import { getDailyNutritionSummary } from '../services/dailySummaryService';
import { listFoodEntriesByDate } from '../services/foodEntryRepository';
import { useFoodLogQuery } from './useFoodLogQuery';

async function loadDayFoodLog(dateKey: string) {
  const [summary, entries] = await Promise.all([
    getDailyNutritionSummary(dateKey),
    listFoodEntriesByDate(dateKey),
  ]);

  return { summary, entries };
}

/** Summary and entries (newest first) for one day. */
export function useDayFoodLog(date: Date) {
  const dateKey = formatDateKey(date);

  return useFoodLogQuery(`day:${dateKey}`, () => loadDayFoodLog(dateKey));
}

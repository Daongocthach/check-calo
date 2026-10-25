import { formatDateKey } from '@/utils/date';
import { getDailyNutritionSummary } from '../services/dailySummaryService';
import { listFoodEntriesByDate } from '../services/foodEntryRepository';
import { groupEntriesByMealSlot } from '../utils/mealSlot';
import { useFoodLogQuery } from './useFoodLogQuery';

async function loadDayFoodLog(dateKey: string) {
  const [summary, entries] = await Promise.all([
    getDailyNutritionSummary(dateKey),
    listFoodEntriesByDate(dateKey),
  ]);

  return { summary, entries, mealGroups: groupEntriesByMealSlot(entries) };
}

/** Summary, entries and meal-slot groups for one day. */
export function useDayFoodLog(date: Date) {
  const dateKey = formatDateKey(date);

  return useFoodLogQuery(`day:${dateKey}`, () => loadDayFoodLog(dateKey));
}

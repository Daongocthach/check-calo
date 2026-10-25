import { useCallback } from 'react';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { getFoodEntryById } from '../services/foodEntryRepositoryCore';
import { removeLoggedFood, updateLoggedFood } from '../services/foodLogService';
import { useFoodEntryRefreshStore } from '../stores/useFoodEntryRefreshStore';
import type { FoodEntryInput } from '../types';
import { useFoodLogQuery } from './useFoodLogQuery';

async function loadMealDetail(entryId: string) {
  const [entry, profile] = await Promise.all([getFoodEntryById(entryId), getUserProfile()]);
  return { entry, profile };
}

export function useMealDetail(entryId: string) {
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const query = useFoodLogQuery(`meal:${entryId}`, () => loadMealDetail(entryId));

  const update = useCallback(
    async (input: FoodEntryInput) => {
      await updateLoggedFood(entryId, input);
      markFoodEntriesChanged();
    },
    [entryId, markFoodEntriesChanged]
  );

  const remove = useCallback(async () => {
    await removeLoggedFood(entryId);
    markFoodEntriesChanged();
  }, [entryId, markFoodEntriesChanged]);

  return {
    entry: query.data?.entry ?? null,
    profile: query.data?.profile ?? null,
    isLoading: query.isLoading && !query.data,
    update,
    remove,
  };
}

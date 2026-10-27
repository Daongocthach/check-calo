import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { useFoodEntryRefreshStore } from '../stores/useFoodEntryRefreshStore';

/** Query-key prefix shared by every local SQLite read, so one write can invalidate them all. */
export const FOOD_LOG_QUERY_SCOPE = 'food-log';

interface FoodLogQueryState<T> {
  data: T | null;
  /** True only until the first result for this key arrives; cached data never shows a spinner. */
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads data from the local SQLite database through the shared query cache. Revisiting a screen
 * shows the cached result immediately and revalidates it in the background on focus; any food
 * log write (`markFoodEntriesChanged`) invalidates every key, see {@link useFoodLogInvalidation}.
 */
export function useFoodLogQuery<T>(key: string, loader: () => Promise<T>): FoodLogQueryState<T> {
  const query = useQuery({
    queryKey: [FOOD_LOG_QUERY_SCOPE, key],
    queryFn: loader,
    // Local reads are cheap and other writers (cloud sync, date rollover) do not always bump the
    // revision, so cached data is shown first but always revalidated.
    staleTime: 0,
    // Switching keys (e.g. swiping to another week) keeps the previous result on screen until
    // the new one loads, instead of flashing an empty state.
    placeholderData: keepPreviousData,
    retry: false,
    meta: { localOnly: true },
  });
  const { refetch } = query;
  const hasFocusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // The mount already fetched; only revalidate when coming back to the screen.
      if (hasFocusedRef.current) {
        void refetch();
      }
      hasFocusedRef.current = true;
    }, [refetch])
  );

  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
  };
}

/** Invalidates every food log query after a local write. Mount once near the app root. */
export function useFoodLogInvalidation() {
  const queryClient = useQueryClient();
  const refreshRevision = useFoodEntryRefreshStore((state) => state.refreshRevision);
  const lastRevisionRef = useRef(refreshRevision);

  useEffect(() => {
    if (lastRevisionRef.current === refreshRevision) {
      return;
    }
    lastRevisionRef.current = refreshRevision;
    void queryClient.invalidateQueries({ queryKey: [FOOD_LOG_QUERY_SCOPE] });
  }, [queryClient, refreshRevision]);
}

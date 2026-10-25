import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFoodEntryRefreshStore } from '../stores/useFoodEntryRefreshStore';

interface FoodLogQueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads data from the local SQLite database and reloads it when the screen gains focus,
 * when `key` changes, or after any food log write (`markFoodEntriesChanged`).
 */
export function useFoodLogQuery<T>(key: string, loader: () => Promise<T>) {
  const refreshRevision = useFoodEntryRefreshStore((state) => state.refreshRevision);
  const loaderRef = useRef(loader);
  const requestId = `${key}#${refreshRevision}`;
  const latestRequestRef = useRef(requestId);
  const [state, setState] = useState<FoodLogQueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      latestRequestRef.current = requestId;

      setState((previous) => ({ ...previous, isLoading: true }));
      loaderRef
        .current()
        .then((data) => {
          if (active && latestRequestRef.current === requestId) {
            setState({ data, isLoading: false, error: null });
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setState((previous) => ({
              ...previous,
              isLoading: false,
              error: error instanceof Error ? error : new Error(String(error)),
            }));
          }
        });

      return () => {
        active = false;
      };
    }, [requestId])
  );

  return state;
}

import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/providers/auth/authStore';
import { processPendingFoodEntryImageSyncQueue } from '../services/foodImageSyncQueue';
import {
  syncFoodEntriesDeltaFromSupabase,
  syncRecentFoodsDeltaFromSupabase,
} from '../services/foodLogDeltaSync';

function handleSyncError(error: unknown) {
  if (__DEV__) {
    console.warn('[NutritionSync] Background sync failed', error);
  }
}

function runNutritionSync() {
  processPendingFoodEntryImageSyncQueue().catch(handleSyncError);
  syncFoodEntriesDeltaFromSupabase().catch(handleSyncError);
  syncRecentFoodsDeltaFromSupabase().catch(handleSyncError);
}

export function useFoodLogSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    runNutritionSync();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    runNutritionSync();
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        runNutritionSync();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        runNutritionSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription.remove();
  }, [isAuthenticated]);
}

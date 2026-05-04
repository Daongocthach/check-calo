import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '@/providers/auth/authStore';
import { processPendingFoodEntryImageSyncQueue } from '../services/foodEntrySyncQueue';
import { syncFoodEntriesDeltaFromSupabase } from '../services/nutritionDeltaSync';

function runNutritionSync() {
  void processPendingFoodEntryImageSyncQueue();
  void syncFoodEntriesDeltaFromSupabase();
}

export function useFoodEntrySyncQueue() {
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

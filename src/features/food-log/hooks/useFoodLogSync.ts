import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { syncQuestCompletions } from '@/features/buddy/services/questCompletionSync';
import { syncWeightGoals } from '@/features/goals/services/weightGoalSync';
import { syncWeightLogs } from '@/features/goals/services/weightLogSync';
import { syncDailyTargets } from '@/features/profile/services/dailyTargetSync';
import { useAuthStore } from '@/providers/auth/authStore';
import { processPendingFoodEntryImageSyncQueue } from '../services/foodImageSyncQueue';
import {
  syncFoodEntriesDeltaFromSupabase,
  syncRecentFoodsDeltaFromSupabase,
} from '../services/foodLogDeltaSync';
import { useFoodEntryRefreshStore } from '../stores/useFoodEntryRefreshStore';

function handleSyncError(error: unknown) {
  if (__DEV__) {
    console.warn('[NutritionSync] Background sync failed', error);
  }
}

function refreshWhenChanged(changedCount: number) {
  if (changedCount > 0) {
    useFoodEntryRefreshStore.getState().markFoodEntriesChanged();
  }
}

function runNutritionSync() {
  processPendingFoodEntryImageSyncQueue().catch(handleSyncError);
  syncFoodEntriesDeltaFromSupabase().catch(handleSyncError);
  syncRecentFoodsDeltaFromSupabase().catch(handleSyncError);
  syncWeightLogs().then(refreshWhenChanged).catch(handleSyncError);
  syncDailyTargets().then(refreshWhenChanged).catch(handleSyncError);
  syncWeightGoals().then(refreshWhenChanged).catch(handleSyncError);
  syncQuestCompletions().then(refreshWhenChanged).catch(handleSyncError);
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

import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useAuthStore } from '@/providers/auth/authStore';
import { processPendingFoodEntryImageSyncQueue } from '../services/foodEntrySyncQueue';

export function useFoodEntrySyncQueue() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    void processPendingFoodEntryImageSyncQueue();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void processPendingFoodEntryImageSyncQueue();
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void processPendingFoodEntryImageSyncQueue();
      }
    });

    return () => unsubscribe();
  }, []);
}

import { useNavigation, useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Closes the whole `(auth)` modal, however many auth screens were pushed, and returns to the
 * screen that opened it. Falls back to the dashboard when auth was the entry point (deep link).
 */
export function useCloseAuthFlow() {
  const navigation = useNavigation();
  const router = useRouter();

  return useCallback(() => {
    const rootNavigation = navigation.getParent();

    if (rootNavigation?.canGoBack()) {
      rootNavigation.goBack();
      return;
    }

    router.replace('/');
  }, [navigation, router]);
}

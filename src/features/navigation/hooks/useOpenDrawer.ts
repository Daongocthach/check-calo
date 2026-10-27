import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { useCallback } from 'react';

/** Opens the app drawer from any screen rendered inside it. */
export function useOpenDrawer() {
  const navigation = useNavigation();

  return useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);
}

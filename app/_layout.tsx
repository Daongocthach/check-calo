import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Appearance, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { StyleSheet } from 'react-native-unistyles';
import { AppHeader } from '@/common/components/AppHeader';
import { ErrorBoundary } from '@/common/components/ErrorBoundary';
import {
  initializeCalorieReminderNotifications,
  isCalorieReminderResponse,
} from '@/features/notifications/services/calorieReminderService';
import { useFoodEntrySyncQueue } from '@/features/nutrition/hooks/useFoodEntrySyncQueue';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { QueryProvider } from '@/providers';
import { AppAlertProvider } from '@/providers/app-alert/AppAlertProvider';
import { useAuthStore } from '@/providers/auth/authStore';
import { AppBottomSheetProvider } from '@/providers/bottom-sheet';
import { CameraProvider } from '@/providers/camera';
import { initializeDatabase } from '@/services/database/sqlite';
import { ensureDeviceLocalId } from '@/services/device/deviceLocalId';
import { handleSystemThemeChange } from '@/theme/themeManager';
import InterBold from '../assets/fonts/Inter-Bold.ttf';
import InterMedium from '../assets/fonts/Inter-Medium.ttf';
import InterRegular from '../assets/fonts/Inter-Regular.ttf';
import InterSemiBold from '../assets/fonts/Inter-SemiBold.ttf';

SplashScreen.preventAutoHideAsync();

function useAuthInit() {
  const initialize = useAuthStore((s) => s.initialize);
  const cleanup = useAuthStore((s) => s.cleanup);

  useEffect(() => {
    initialize();
    return () => cleanup();
  }, [initialize, cleanup]);
}

function RootNavigator() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
      initialRouteName="(main)"
    >
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

function AppContent() {
  useAuthInit();
  useFoodEntrySyncQueue();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkForAppUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (!active || !update.isAvailable) {
          return;
        }

        await Updates.fetchUpdateAsync();

        if (!active) {
          return;
        }

        await Updates.reloadAsync();
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to check for app update', error);
        }
      }
    };

    void checkForAppUpdate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void initializeCalorieReminderNotifications().catch((error: unknown) => {
      if (__DEV__) {
        console.error('Failed to initialize calorie reminders', error);
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!mounted || !isCalorieReminderResponse(response)) {
        return;
      }

      useAddMealSourceSheetStore.getState().requestOpen();
      router.replace('/');
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isCalorieReminderResponse(response)) {
        return;
      }

      useAddMealSourceSheetStore.getState().requestOpen();
      router.replace('/');
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [router]);

  return (
    <View style={styles.appContainer}>
      <AppHeader />
      <RootNavigator />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': InterRegular,
    'Inter-Medium': InterMedium,
    'Inter-SemiBold': InterSemiBold,
    'Inter-Bold': InterBold,
  });
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    let active = true;

    void initializeDatabase()
      .then(() => ensureDeviceLocalId())
      .catch((error: unknown) => {
        if (__DEV__) {
          console.error('Failed to initialize local persistence', error);
        }
      })
      .finally(() => {
        if (active) {
          setDatabaseReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      handleSystemThemeChange();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && databaseReady) {
      void SplashScreen.hideAsync();
    }
  }, [databaseReady, fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || !databaseReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <ErrorBoundary>
        <QueryProvider>
          <KeyboardProvider>
            <CameraProvider>
              <AppBottomSheetProvider>
                <AppAlertProvider>
                  <AppContent />
                </AppAlertProvider>
              </AppBottomSheetProvider>
              <Toast />
            </CameraProvider>
          </KeyboardProvider>
        </QueryProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create((theme) => ({
  rootView: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  appContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
}));

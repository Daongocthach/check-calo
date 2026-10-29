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
import { ErrorBoundary } from '@/common/components/ErrorBoundary';
import { useFoodLogInvalidation } from '@/features/food-log/hooks/useFoodLogQuery';
import { useFoodLogSync } from '@/features/food-log/hooks/useFoodLogSync';
import {
  initializeCalorieReminderNotifications,
  isCalorieReminderResponse,
} from '@/features/notifications/services/calorieReminderService';
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

export const unstable_settings = {
  anchor: '(main)',
};

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
    >
      <Stack.Screen name="(main)" />
      {/* Sign-in, sign-up and password reset open as one modal over whatever screen asked. */}
      <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

function AppContent() {
  useAuthInit();
  useFoodLogSync();
  useFoodLogInvalidation();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkForAppUpdate = async () => {
      // expo-updates rejects checks in development builds.
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }

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

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!mounted || !isCalorieReminderResponse(response)) {
          return;
        }

        router.push('/chat');
      })
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('Failed to read last notification response', error);
        }
      });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!isCalorieReminderResponse(response)) {
        return;
      }

      router.push('/chat');
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [router]);

  return (
    <View style={styles.appContainer}>
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

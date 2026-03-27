import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ErrorBoundary } from '@/common/components/ErrorBoundary';
import { QueryProvider } from '@/providers';
import { AppAlertProvider } from '@/providers/app-alert/AppAlertProvider';
import { useAuthStore } from '@/providers/auth/authStore';
import { CameraProvider } from '@/providers/camera';
import { initializeDatabase } from '@/services/database/sqlite';
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
  const { theme } = useUnistyles();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background.app },
      }}
      initialRouteName="welcome"
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(main)" />
    </Stack>
  );
}

function AppContent() {
  useAuthInit();

  return (
    <View style={styles.appContainer}>
      <RootNavigator />
      <Toast />
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
      .catch((error: unknown) => {
        if (__DEV__) {
          console.error('Failed to initialize database', error);
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

  const onLayoutRootView = useCallback(async () => {
    if ((fontsLoaded || fontError) && databaseReady) {
      await SplashScreen.hideAsync();
    }
  }, [databaseReady, fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || !databaseReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.rootView} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <QueryProvider>
          <KeyboardProvider>
            <CameraProvider>
              <BottomSheetModalProvider>
                <AppAlertProvider>
                  <AppContent />
                </AppAlertProvider>
              </BottomSheetModalProvider>
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

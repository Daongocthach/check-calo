import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppDrawerContent } from '@/features/navigation';

export default function DrawerLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <Drawer
      // Back from any drawer screen returns to the dashboard, then leaves the app.
      backBehavior="initialRoute"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        // The menu button sits top-right in every drawer screen header.
        drawerPosition: 'right',
        drawerType: 'front',
        // Screens stay mounted after the first visit (lazy) and freeze while hidden, so
        // switching back keeps scroll position and state without re-rendering in the background.
        lazy: true,
        freezeOnBlur: true,
        overlayColor: theme.colors.overlay.modal,
        drawerStyle: styles.drawer,
        sceneStyle: styles.scene,
      }}
    >
      <Drawer.Screen name="index" options={{ title: t('drawer.dashboard') }} />
      <Drawer.Screen name="buddy" options={{ title: t('drawer.buddy') }} />
      <Drawer.Screen name="profile" options={{ title: t('drawer.profile') }} />
      <Drawer.Screen name="settings" options={{ title: t('drawer.settings') }} />
    </Drawer>
  );
}

const styles = StyleSheet.create((theme) => ({
  drawer: {
    backgroundColor: theme.colors.background.app,
  },
  scene: {
    backgroundColor: theme.colors.background.app,
  },
}));

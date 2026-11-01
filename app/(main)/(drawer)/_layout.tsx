import { Drawer } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ContentColumn } from '@/common/components';
import { AppDrawerContent, useIsPermanentDrawer } from '@/features/navigation';

export default function DrawerLayout() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const isPermanent = useIsPermanentDrawer();

  return (
    <Drawer
      // Back from any drawer screen returns to the dashboard, then leaves the app.
      backBehavior="initialRoute"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenLayout={({ children }) => <ContentColumn>{children}</ContentColumn>}
      screenOptions={{
        headerShown: false,
        // Wide windows (iPad) pin the menu on the left like a sidebar. Phones open it from the
        // menu button, which sits top-right in every drawer screen header.
        drawerPosition: isPermanent ? 'left' : 'right',
        drawerType: isPermanent ? 'permanent' : 'front',
        // Screens stay mounted after the first visit (lazy) and freeze while hidden, so
        // switching back keeps scroll position and state without re-rendering in the background.
        lazy: true,
        freezeOnBlur: true,
        overlayColor: theme.colors.overlay.modal,
        drawerStyle: isPermanent ? [styles.drawer, styles.sidebar] : styles.drawer,
        sceneStyle: styles.scene,
      }}
    >
      <Drawer.Screen name="index" options={{ title: t('drawer.dashboard') }} />
      <Drawer.Screen name="buddy" options={{ title: t('drawer.buddy') }} />
      <Drawer.Screen name="settings" options={{ title: t('drawer.settings') }} />
    </Drawer>
  );
}

const styles = StyleSheet.create((theme) => ({
  drawer: {
    backgroundColor: theme.colors.background.app,
  },
  sidebar: {
    width: 300,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border.default,
  },
  scene: {
    backgroundColor: theme.colors.background.app,
  },
}));

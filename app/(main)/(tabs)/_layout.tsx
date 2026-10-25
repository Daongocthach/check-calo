import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { TabBar } from '@/common/components/TabBar';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
        <Tabs.Screen name="achievements" options={{ title: t('tabs.achievements') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      </Tabs>
      {/* Keeps scrolled content from showing through the status bar. */}
      <View style={styles.statusBarCover} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rt.insets.top,
    backgroundColor: theme.colors.background.app,
  },
}));

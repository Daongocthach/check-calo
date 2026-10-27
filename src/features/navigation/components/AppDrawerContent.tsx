import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, Text } from '@/common/components';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { useAuthStore } from '@/providers/auth/authStore';
import { DRAWER_ROUTES, type DrawerRouteItem } from '../constants/drawerRoutes';

export function AppDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const isAnonymous = !user || user.isAnonymous;
  const displayName = profile?.displayName.trim() || t('profileTab.guest');
  const focusedRouteName = state.routes[state.index]?.name;
  const versionLabel = `v${Application.nativeApplicationVersion ?? '1.0.0'}`;

  const handleItemPress = (item: DrawerRouteItem) => {
    if (item.name === focusedRouteName) {
      navigation.closeDrawer();
      return;
    }

    // Jumps within the drawer (no new page on the stack); the drawer closes on route change.
    navigation.navigate(item.name);
  };

  const handleSignIn = () => {
    navigation.closeDrawer();
    router.push('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar initials={displayName.slice(0, 2).toUpperCase()} size="lg" />
        <View style={styles.flex}>
          <Text variant="body" weight="bold" numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {isAnonymous ? t('profileTab.guestAccount') : (user?.email ?? '')}
          </Text>
        </View>
      </View>

      <View style={styles.items}>
        {DRAWER_ROUTES.map((item) => {
          const focused = item.name === focusedRouteName;

          return (
            <Pressable
              key={item.name}
              onPress={() => handleItemPress(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              style={({ pressed }) => [
                styles.item,
                focused && styles.itemFocused,
                pressed && styles.itemPressed,
              ]}
            >
              <Icon
                name={focused ? item.activeIcon : item.icon}
                variant={focused ? 'brand' : 'secondary'}
                sizeVariant="md"
              />
              <Text
                variant="body"
                weight={focused ? 'semibold' : 'medium'}
                color={focused ? 'link' : 'primary'}
              >
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {isAnonymous ? (
          <Pressable
            onPress={handleSignIn}
            accessibilityRole="button"
            style={({ pressed }) => [styles.signIn, pressed && styles.itemPressed]}
          >
            <Icon name="log-in-outline" variant="brand" sizeVariant="md" />
            <View style={styles.flex}>
              <Text variant="bodySmall" weight="semibold" color="link">
                {t('profileTab.signIn')}
              </Text>
              <Text variant="caption" color="secondary">
                {t('profileTab.signInHint')}
              </Text>
            </View>
          </Pressable>
        ) : null}
        <Text variant="caption" color="tertiary">
          {t('profileTab.version', { version: versionLabel })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    flexGrow: 1,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p16,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  flex: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  items: {
    gap: theme.metrics.spacingV.p4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  itemFocused: {
    backgroundColor: theme.colors.overlay.hover,
  },
  itemPressed: {
    backgroundColor: theme.colors.overlay.pressed,
  },
  footer: {
    marginTop: 'auto',
    gap: theme.metrics.spacingV.p12,
  },
  signIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
}));

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, ScreenHeader, Text } from '@/common/components';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { GoalTrackingCard } from '@/features/goals/components/GoalTrackingCard';
import { useGoalTracking } from '@/features/goals/hooks/useGoalTracking';
import { DrawerMenuButton } from '@/features/navigation';
import { SettingsGroup, SettingsRow } from '@/features/settings/components/SettingsRow';
import { useBottomPadding } from '@/hooks';
import { useAuthStore } from '@/providers/auth/authStore';
import { getUserProfile } from '../services/profileRepository';

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const goals = useGoalTracking();
  const isAnonymous = !user || user.isAnonymous;
  const displayName = profile?.displayName.trim() || t('profileTab.guest');

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('profileTab.title')}
        subtitle={t('profileTab.subtitle')}
        showBack={false}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.push('/welcome')}
          accessibilityRole="button"
          accessibilityLabel={t('profileTab.editProfile')}
          style={styles.profileCard}
        >
          <Avatar initials={displayName.slice(0, 2).toUpperCase()} size="lg" />
          <View style={styles.flex}>
            <Text variant="body" weight="bold">
              {displayName}
            </Text>
            <Text variant="caption" color="secondary">
              {profile
                ? t('profileTab.profileSummary', {
                    kcal: profile.dailyCalorieTarget,
                    weight: Math.round(profile.weightKg),
                  })
                : t('profileTab.profileEmpty')}
            </Text>
            <Text variant="caption" color="link" weight="semibold">
              {isAnonymous ? t('profileTab.guestAccount') : (user?.email ?? '')}
            </Text>
          </View>
          <Icon name="create-outline" variant="secondary" size={20} />
        </Pressable>

        {goals.todaySummary ? (
          <GoalTrackingCard
            goalTracking={goals.snapshot}
            todaySummary={goals.todaySummary}
            profile={profile}
          />
        ) : null}

        <SettingsGroup title={t('profileTab.goals')}>
          <SettingsRow
            icon="refresh-outline"
            title={t('profileTab.restart')}
            subtitle={t('profileTab.restartHint')}
            onPress={() => router.push('/welcome')}
          />
          <SettingsRow
            icon="trophy-outline"
            title={t('profileTab.goalHistory')}
            onPress={() => router.push('/goal-history')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('profileTab.account')}>
          {isAnonymous ? (
            <SettingsRow
              icon="log-in-outline"
              title={t('profileTab.signIn')}
              subtitle={t('profileTab.signInHint')}
              onPress={() => router.push('/login')}
            />
          ) : null}
          <SettingsRow
            icon="person-circle-outline"
            title={t('accountScreen.title')}
            subtitle={isAnonymous ? undefined : user?.email}
            onPress={() => router.push('/account')}
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p20,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
}));

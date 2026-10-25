import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, IconButton, Select, Text } from '@/common/components';
import { deleteCurrentUserCloudNutritionData } from '@/features/auth/services/authService';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { resetLocalNutritionData } from '@/features/food-log/services/localDataReset';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { useBottomPadding } from '@/hooks';
import { appAlert } from '@/providers/app-alert';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';
import { usePreferences } from '../hooks/usePreferences';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function ProfileTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const user = useAuthStore((state) => state.user);
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const { data: profile } = useFoodLogQuery('profile', getUserProfile);
  const preferences = usePreferences();
  const isAnonymous = !user || user.isAnonymous;
  const displayName = profile?.displayName.trim() || t('profileTab.guest');
  const versionLabel = `v${Application.nativeApplicationVersion ?? '1.0.0'}`;

  const themeOptions = [
    { label: t('header.themeSystem'), value: 'system' },
    { label: t('header.themeLight'), value: 'light' },
    { label: t('header.themeDark'), value: 'dark' },
  ];
  const languageOptions = [
    { label: t('language.vietnamese'), value: 'vi' },
    { label: t('language.english'), value: 'en' },
  ];

  const confirmReset = () => {
    appAlert.alert(t('profileTab.resetTitle'), t('profileTab.resetMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profileTab.resetConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteCurrentUserCloudNutritionData();
              await resetLocalNutritionData();
              markFoodEntriesChanged();
              router.replace('/welcome');
            } catch (error) {
              toast.error(error instanceof Error ? error.message : t('errors.generic'));
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="h1" weight="bold">
            {t('profileTab.title')}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {t('profileTab.subtitle')}
          </Text>
        </View>
        <IconButton
          icon="settings-outline"
          variant="outline"
          onPress={() => router.push('/account')}
          accessibilityLabel={t('accountScreen.title')}
        />
      </View>

      <Pressable
        onPress={() => router.push('/welcome')}
        accessibilityRole="button"
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

      <SettingsGroup title={t('profileTab.settings')}>
        <SettingsRow
          icon="refresh-outline"
          title={t('profileTab.restart')}
          subtitle={t('profileTab.restartHint')}
          onPress={() => router.push('/welcome')}
        />
        <SettingsRow
          icon="notifications-outline"
          title={t('profileTab.reminders')}
          onPress={() => router.push('/notification-settings')}
        />
        <SettingsRow
          icon="color-palette-outline"
          title={t('profileTab.appearance')}
          right={
            <Select
              value={preferences.theme}
              onChange={preferences.changeTheme}
              options={themeOptions}
              size="sm"
              triggerVariant="plain"
            >
              <Text variant="bodySmall" color="secondary">
                {themeOptions.find((option) => option.value === preferences.theme)?.label}
              </Text>
            </Select>
          }
        />
        <SettingsRow
          icon="language-outline"
          title={t('profileTab.language')}
          right={
            <Select
              value={preferences.language}
              onChange={preferences.changeLanguage}
              options={languageOptions}
              size="sm"
              triggerVariant="plain"
            >
              <Text variant="bodySmall" color="secondary">
                {languageOptions.find((option) => option.value === preferences.language)?.label}
              </Text>
            </Select>
          }
        />
        <SettingsRow
          icon="trophy-outline"
          title={t('profileTab.goalHistory')}
          onPress={() => router.push('/goal-history')}
        />
      </SettingsGroup>

      <SettingsGroup title={t('profileTab.other')}>
        <SettingsRow
          icon="headset-outline"
          title={t('profileTab.support')}
          onPress={() => router.push('/support')}
        />
        <SettingsRow
          icon="mail-outline"
          title={t('settings.contact')}
          onPress={() => router.push('/contact')}
        />
        <SettingsRow
          icon="document-text-outline"
          title={t('profileTab.healthSources')}
          onPress={() => router.push('/health-information-sources')}
        />
        <SettingsRow
          icon="shield-outline"
          title={t('settings.privacy')}
          onPress={() => router.push('/privacy')}
          external
        />
        <SettingsRow
          icon="reader-outline"
          title={t('settings.terms')}
          onPress={() => router.push('/terms')}
          external
        />
        <SettingsRow
          icon="information-circle-outline"
          title={t('settings.about')}
          onPress={() => router.push('/about')}
        />
        {isAnonymous ? (
          <SettingsRow
            icon="log-in-outline"
            title={t('profileTab.signIn')}
            subtitle={t('profileTab.signInHint')}
            onPress={() => router.push('/(auth)/login')}
          />
        ) : null}
        <SettingsRow
          icon="trash-outline"
          title={t('profileTab.resetData')}
          onPress={confirmReset}
          destructive
        />
      </SettingsGroup>

      <Text variant="caption" color="tertiary" align="center">
        {t('profileTab.version', { version: versionLabel })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p20,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
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

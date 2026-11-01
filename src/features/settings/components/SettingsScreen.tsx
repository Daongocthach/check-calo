import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ScreenHeader, Switch } from '@/common/components';
import { deleteCurrentUserCloudNutritionData } from '@/features/auth/services/authService';
import { useDevToolsStore } from '@/features/dev-tools';
import { resetLocalNutritionData } from '@/features/food-log/services/localDataReset';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { DrawerMenuButton, useIsPermanentDrawer } from '@/features/navigation';
import { useBottomPadding } from '@/hooks';
import { LANGUAGE_INFO, toAppLanguage } from '@/i18n/languages';
import { appAlert } from '@/providers/app-alert';
import { useAuthStore } from '@/providers/auth/authStore';
import { toast } from '@/utils/toast';
import { usePreferences } from '../hooks/usePreferences';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const bottomPadding = useBottomPadding();
  // The pinned sidebar already links back to the dashboard.
  const isPermanentDrawer = useIsPermanentDrawer();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const preferences = usePreferences();
  const devModeEnabled = useDevToolsStore((state) => state.enabled);
  const setDevModeEnabled = useDevToolsStore((state) => state.setEnabled);
  const user = useAuthStore((state) => state.user);
  const isAnonymous = !user || user.isAnonymous;

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
    <View style={styles.container}>
      <ScreenHeader
        title={t('settingsScreen.title')}
        showBack={!isPermanentDrawer}
        subtitle={t('settingsScreen.subtitle')}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        // Edit dialogs get touches through this ScrollView; without this the first tap on
        // their buttons only dismisses the keyboard.
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            subtitle={isAnonymous ? t('profileTab.guestAccount') : user?.email}
            onPress={() => router.push('/account')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settingsScreen.general')}>
          <SettingsRow
            icon="notifications-outline"
            title={t('profileTab.reminders')}
            onPress={() => router.push('/reminders')}
          />
          <SettingsRow
            icon="color-palette-outline"
            title={t('profileTab.appearance')}
            subtitle={t('header.themeDark')}
            right={
              <Switch
                value={theme.colors.mode === 'dark'}
                onValueChange={(enabled) => preferences.changeTheme(enabled ? 'dark' : 'light')}
                accessibilityLabel={t('header.themeDark')}
              />
            }
          />
          <SettingsRow
            icon="language-outline"
            title={t('profileTab.language')}
            value={t(`language.${LANGUAGE_INFO[toAppLanguage(i18n.language)].labelKey}`)}
            onPress={() => router.push('/language')}
          />
          <SettingsRow
            icon="heart-outline"
            title={t('profileTab.support')}
            onPress={() => router.push('/support')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settingsScreen.healthAndPrivacy')}>
          <SettingsRow
            icon="document-text-outline"
            title={t('profileTab.healthSources')}
            onPress={() => router.push('/health-sources')}
          />
          <SettingsRow
            icon="shield-outline"
            title={t('settings.privacy')}
            onPress={() => router.push('/privacy')}
            external
          />
          <SettingsRow
            icon="mail-outline"
            title={t('settings.contact')}
            onPress={() => router.push('/contact')}
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
          <SettingsRow
            icon="trash-outline"
            title={t('profileTab.resetData')}
            onPress={confirmReset}
            destructive
          />
        </SettingsGroup>

        {__DEV__ ? (
          <SettingsGroup title={t('devTools.group')}>
            <SettingsRow
              icon="construct-outline"
              title={t('devTools.toggle')}
              subtitle={t('devTools.toggleHint')}
              right={
                <Switch
                  value={devModeEnabled}
                  onValueChange={setDevModeEnabled}
                  accessibilityLabel={t('devTools.toggle')}
                />
              }
            />
            {devModeEnabled ? (
              <SettingsRow
                icon="flask-outline"
                title={t('devTools.title')}
                onPress={() => router.push('/dev-tools')}
              />
            ) : null}
          </SettingsGroup>
        ) : null}
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
}));

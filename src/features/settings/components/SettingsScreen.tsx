import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ScreenHeader, Select, Switch, Text } from '@/common/components';
import { deleteCurrentUserCloudNutritionData } from '@/features/auth/services/authService';
import { useDevToolsStore } from '@/features/dev-tools';
import { resetLocalNutritionData } from '@/features/food-log/services/localDataReset';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { DrawerMenuButton } from '@/features/navigation';
import { useBottomPadding } from '@/hooks';
import { appAlert } from '@/providers/app-alert';
import { toast } from '@/utils/toast';
import { usePreferences } from '../hooks/usePreferences';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const preferences = usePreferences();
  const devModeEnabled = useDevToolsStore((state) => state.enabled);
  const setDevModeEnabled = useDevToolsStore((state) => state.setEnabled);

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
    <View style={styles.container}>
      <ScreenHeader
        title={t('settingsScreen.title')}
        subtitle={t('settingsScreen.subtitle')}
        showBack={false}
        right={<DrawerMenuButton />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup title={t('settingsScreen.general')}>
          <SettingsRow
            icon="notifications-outline"
            title={t('profileTab.reminders')}
            onPress={() => router.push('/reminders')}
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
        </SettingsGroup>

        <SettingsGroup title={t('profileTab.other')}>
          <SettingsRow
            icon="heart-outline"
            title={t('profileTab.support')}
            onPress={() => router.push('/support')}
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

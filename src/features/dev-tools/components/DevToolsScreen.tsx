import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ScreenHeader, Select, Switch, Text } from '@/common/components';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { SettingsGroup, SettingsRow } from '@/features/settings/components/SettingsRow';
import { useBottomPadding } from '@/hooks';
import { appAlert } from '@/providers/app-alert';
import { toast } from '@/utils/toast';
import { clearSampleFoodEntries, seedSampleFoodEntries } from '../services/sampleData';
import { useDevToolsStore, type DevChatScenario } from '../stores/useDevToolsStore';

const SAMPLE_DAYS = 7;
const CHAT_SCENARIOS: DevChatScenario[] = ['normal', 'slow', 'quota', 'auth', 'error'];

function isChatScenario(value: string): value is DevChatScenario {
  return CHAT_SCENARIOS.some((scenario) => scenario === value);
}

/** UI testing tools, reachable from Settings while dev mode is on (dev builds only). */
export function DevToolsScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const bottomPadding = useBottomPadding();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const devTools = useDevToolsStore();
  const [busyAction, setBusyAction] = useState<'seed' | 'clear' | null>(null);

  if (!__DEV__ || !devTools.enabled) {
    return <Redirect href="/" />;
  }

  const scenarioOptions = CHAT_SCENARIOS.map((scenario) => ({
    label: t(`devTools.chatScenarios.${scenario}`),
    value: scenario,
  }));

  const runSampleAction = async (action: 'seed' | 'clear') => {
    setBusyAction(action);

    try {
      if (action === 'seed') {
        const count = await seedSampleFoodEntries(SAMPLE_DAYS);
        toast.success(t('devTools.seeded', { count }));
      } else {
        const count = await clearSampleFoodEntries();
        toast.success(t('devTools.cleared', { count }));
      }
      markFoodEntriesChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    } finally {
      setBusyAction(null);
    }
  };

  const busyIndicator = <ActivityIndicator size="small" color={theme.colors.brand.primary} />;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('devTools.title')} subtitle={t('devTools.subtitle')} />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup title={t('devTools.sampleData')}>
          <SettingsRow
            icon="add-circle-outline"
            title={t('devTools.seed', { count: SAMPLE_DAYS })}
            subtitle={t('devTools.seedHint')}
            onPress={busyAction ? undefined : () => void runSampleAction('seed')}
            right={busyAction === 'seed' ? busyIndicator : undefined}
          />
          <SettingsRow
            icon="trash-outline"
            title={t('devTools.clear')}
            subtitle={t('devTools.clearHint')}
            onPress={busyAction ? undefined : () => void runSampleAction('clear')}
            right={busyAction === 'clear' ? busyIndicator : undefined}
            destructive
          />
        </SettingsGroup>

        <SettingsGroup title={t('devTools.screenStates')}>
          <SettingsRow
            icon="file-tray-outline"
            title={t('devTools.forceEmptyDiary')}
            subtitle={t('devTools.forceEmptyDiaryHint')}
            right={
              <Switch
                value={devTools.forceEmptyDiary}
                onValueChange={devTools.setForceEmptyDiary}
                accessibilityLabel={t('devTools.forceEmptyDiary')}
              />
            }
          />
          <SettingsRow
            icon="sparkles-outline"
            title={t('devTools.chatScenario')}
            subtitle={t('devTools.chatScenarioHint')}
            right={
              <Select
                value={devTools.chatScenario}
                onChange={(value) => {
                  if (isChatScenario(value)) {
                    devTools.setChatScenario(value);
                  }
                }}
                options={scenarioOptions}
                size="sm"
                triggerVariant="plain"
              >
                <Text variant="bodySmall" color="secondary">
                  {t(`devTools.chatScenarios.${devTools.chatScenario}`)}
                </Text>
              </Select>
            }
          />
          <SettingsRow
            icon="barcode-outline"
            title={t('devTools.fakeBarcode')}
            subtitle={t('devTools.fakeBarcodeHint')}
            right={
              <Switch
                value={devTools.fakeBarcodeScan}
                onValueChange={devTools.setFakeBarcodeScan}
                accessibilityLabel={t('devTools.fakeBarcode')}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t('devTools.notifications')}>
          <SettingsRow
            icon="checkmark-circle-outline"
            title={t('devTools.toastSuccess')}
            onPress={() => toast.success(t('devTools.sampleMessage'))}
          />
          <SettingsRow
            icon="close-circle-outline"
            title={t('devTools.toastError')}
            onPress={() => toast.error(t('devTools.sampleMessage'))}
          />
          <SettingsRow
            icon="information-circle-outline"
            title={t('devTools.toastInfo')}
            onPress={() => toast.info(t('devTools.sampleMessage'))}
          />
          <SettingsRow
            icon="warning-outline"
            title={t('devTools.toastWarning')}
            onPress={() => toast.warning(t('devTools.sampleMessage'))}
          />
          <SettingsRow
            icon="chatbox-ellipses-outline"
            title={t('devTools.alert')}
            onPress={() =>
              appAlert.alert(t('devTools.alertTitle'), t('devTools.sampleMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.ok') },
              ])
            }
          />
          <SettingsRow
            icon="alert-circle-outline"
            title={t('devTools.destructiveAlert')}
            onPress={() =>
              appAlert.alert(t('devTools.alertTitle'), t('devTools.sampleMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), style: 'destructive' },
              ])
            }
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
}));

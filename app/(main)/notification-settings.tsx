import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, DateTimeField, ScreenContainer, Switch, Text } from '@/common/components';
import {
  getDefaultCalorieReminderSettings,
  requestCalorieReminderPermissions,
  syncCalorieReminderSchedule,
} from '@/features/notifications/services/calorieReminderService';
import { STORAGE_KEYS, useStorage, useStorageBoolean } from '@/utils/storage';
import { toast } from '@/utils/toast';

function createTimeBoundary(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getMealTimeBounds(slot: 'breakfast' | 'lunch' | 'dinner') {
  switch (slot) {
    case 'breakfast':
      return {
        minimumDate: createTimeBoundary(5, 0),
        maximumDate: createTimeBoundary(10, 30),
      };
    case 'lunch':
      return {
        minimumDate: createTimeBoundary(10, 30),
        maximumDate: createTimeBoundary(14, 30),
      };
    case 'dinner':
      return {
        minimumDate: createTimeBoundary(17, 0),
        maximumDate: createTimeBoundary(22, 0),
      };
  }
}

function parseTimeValue(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
  return date;
}

function formatTimeValue(value: Date) {
  return `${value.getHours().toString().padStart(2, '0')}:${value
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function formatTimeWindowLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(value);
}

function normalizeReminderTime(slot: 'breakfast' | 'lunch' | 'dinner', value: string) {
  const { minimumDate, maximumDate } = getMealTimeBounds(slot);
  const parsedValue = parseTimeValue(value);

  if (parsedValue < minimumDate) {
    return {
      value: formatTimeValue(minimumDate),
      adjusted: true,
    };
  }

  if (parsedValue > maximumDate) {
    return {
      value: formatTimeValue(maximumDate),
      adjusted: true,
    };
  }

  return {
    value: formatTimeValue(parsedValue),
    adjusted: false,
  };
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const [isUpdatingReminders, setIsUpdatingReminders] = useState(false);
  const defaultReminderSettings = useMemo(() => getDefaultCalorieReminderSettings(), []);
  const calorieRemindersEnabledStorage = useStorageBoolean(
    STORAGE_KEYS.preferences.calorieRemindersEnabled,
    {
      defaultValue: defaultReminderSettings.enabled,
      initializeWithDefault: true,
    }
  );
  const breakfastReminderStorage = useStorage<string>(
    STORAGE_KEYS.preferences.calorieReminderBreakfastTime,
    {
      defaultValue: defaultReminderSettings.breakfastTime,
      initializeWithDefault: true,
    }
  );
  const lunchReminderStorage = useStorage<string>(
    STORAGE_KEYS.preferences.calorieReminderLunchTime,
    {
      defaultValue: defaultReminderSettings.lunchTime,
      initializeWithDefault: true,
    }
  );
  const dinnerReminderStorage = useStorage<string>(
    STORAGE_KEYS.preferences.calorieReminderDinnerTime,
    {
      defaultValue: defaultReminderSettings.dinnerTime,
      initializeWithDefault: true,
    }
  );
  const breakfastLabel = useMemo(() => {
    const bounds = getMealTimeBounds('breakfast');
    return `${t('profileScreen.reminders.breakfast')} (${formatTimeWindowLabel(bounds.minimumDate)} - ${formatTimeWindowLabel(bounds.maximumDate)})`;
  }, [t]);
  const lunchLabel = useMemo(() => {
    const bounds = getMealTimeBounds('lunch');
    return `${t('profileScreen.reminders.lunch')} (${formatTimeWindowLabel(bounds.minimumDate)} - ${formatTimeWindowLabel(bounds.maximumDate)})`;
  }, [t]);
  const dinnerLabel = useMemo(() => {
    const bounds = getMealTimeBounds('dinner');
    return `${t('profileScreen.reminders.dinner')} (${formatTimeWindowLabel(bounds.minimumDate)} - ${formatTimeWindowLabel(bounds.maximumDate)})`;
  }, [t]);

  const handleReminderToggle = useCallback(
    (nextEnabled: boolean) => {
      setIsUpdatingReminders(true);

      void (async () => {
        if (nextEnabled) {
          const permissions = await requestCalorieReminderPermissions();

          if (!permissions.granted) {
            toast.error(t('profileScreen.reminders.permissionDenied'));
            return;
          }
        }

        calorieRemindersEnabledStorage.setValue(nextEnabled);

        await syncCalorieReminderSchedule({
          enabled: nextEnabled,
          breakfastTime: breakfastReminderStorage.value ?? defaultReminderSettings.breakfastTime,
          lunchTime: lunchReminderStorage.value ?? defaultReminderSettings.lunchTime,
          dinnerTime: dinnerReminderStorage.value ?? defaultReminderSettings.dinnerTime,
        });

        toast.success(
          nextEnabled
            ? t('profileScreen.reminders.enabledSuccess')
            : t('profileScreen.reminders.disabledSuccess')
        );
      })()
        .catch(() => {
          toast.error(t('profileScreen.actionError'));
        })
        .finally(() => {
          setIsUpdatingReminders(false);
        });
    },
    [
      breakfastReminderStorage.value,
      calorieRemindersEnabledStorage,
      defaultReminderSettings.breakfastTime,
      defaultReminderSettings.dinnerTime,
      defaultReminderSettings.lunchTime,
      dinnerReminderStorage.value,
      lunchReminderStorage.value,
      t,
    ]
  );

  const handleReminderTimeChange = useCallback(
    (slot: 'breakfast' | 'lunch' | 'dinner', nextValue: string) => {
      setIsUpdatingReminders(true);
      const normalizedTime = normalizeReminderTime(slot, nextValue);

      const nextSettings = {
        enabled: calorieRemindersEnabledStorage.value ?? defaultReminderSettings.enabled,
        breakfastTime:
          slot === 'breakfast'
            ? normalizedTime.value
            : (breakfastReminderStorage.value ?? defaultReminderSettings.breakfastTime),
        lunchTime:
          slot === 'lunch'
            ? normalizedTime.value
            : (lunchReminderStorage.value ?? defaultReminderSettings.lunchTime),
        dinnerTime:
          slot === 'dinner'
            ? normalizedTime.value
            : (dinnerReminderStorage.value ?? defaultReminderSettings.dinnerTime),
      };

      if (slot === 'breakfast') {
        breakfastReminderStorage.setValue(normalizedTime.value);
      }

      if (slot === 'lunch') {
        lunchReminderStorage.setValue(normalizedTime.value);
      }

      if (slot === 'dinner') {
        dinnerReminderStorage.setValue(normalizedTime.value);
      }

      void syncCalorieReminderSchedule(nextSettings)
        .then(() => {
          if (normalizedTime.adjusted) {
            toast.info(t('profileScreen.reminders.adjustedToMealWindow'));
            return;
          }

          toast.success(t('profileScreen.reminders.updatedSuccess'));
        })
        .catch(() => {
          toast.error(t('profileScreen.actionError'));
        })
        .finally(() => {
          setIsUpdatingReminders(false);
        });
    },
    [
      breakfastReminderStorage,
      calorieRemindersEnabledStorage.value,
      defaultReminderSettings.breakfastTime,
      defaultReminderSettings.dinnerTime,
      defaultReminderSettings.enabled,
      defaultReminderSettings.lunchTime,
      dinnerReminderStorage,
      lunchReminderStorage,
      t,
    ]
  );

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="filled" style={styles.settingsCard}>
          <View style={styles.headerRow}>
            <Text variant="body" weight="semibold">
              {t('profileScreen.reminders.toggleLabel')}
            </Text>
            <Switch
              value={calorieRemindersEnabledStorage.value ?? defaultReminderSettings.enabled}
              onValueChange={handleReminderToggle}
              disabled={isUpdatingReminders}
            />
          </View>

          <Text variant="bodySmall" color="secondary">
            {t('profileScreen.reminders.subtitle')}
          </Text>

          <View style={styles.timeGrid}>
            <DateTimeField
              mode="time"
              label={breakfastLabel}
              value={breakfastReminderStorage.value ?? defaultReminderSettings.breakfastTime}
              onChange={(value) => handleReminderTimeChange('breakfast', value)}
              disabled={isUpdatingReminders}
              title={t('profileScreen.reminders.pickTime')}
              placeholder={t('profileScreen.reminders.pickTime')}
              minimumDate={getMealTimeBounds('breakfast').minimumDate}
              maximumDate={getMealTimeBounds('breakfast').maximumDate}
            />
            <DateTimeField
              mode="time"
              label={lunchLabel}
              value={lunchReminderStorage.value ?? defaultReminderSettings.lunchTime}
              onChange={(value) => handleReminderTimeChange('lunch', value)}
              disabled={isUpdatingReminders}
              title={t('profileScreen.reminders.pickTime')}
              placeholder={t('profileScreen.reminders.pickTime')}
              minimumDate={getMealTimeBounds('lunch').minimumDate}
              maximumDate={getMealTimeBounds('lunch').maximumDate}
            />
            <DateTimeField
              mode="time"
              label={dinnerLabel}
              value={dinnerReminderStorage.value ?? defaultReminderSettings.dinnerTime}
              onChange={(value) => handleReminderTimeChange('dinner', value)}
              disabled={isUpdatingReminders}
              title={t('profileScreen.reminders.pickTime')}
              placeholder={t('profileScreen.reminders.pickTime')}
              minimumDate={getMealTimeBounds('dinner').minimumDate}
              maximumDate={getMealTimeBounds('dinner').maximumDate}
            />
          </View>

          <Text variant="caption" color="secondary">
            {t('profileScreen.reminders.hint')}
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p16,
  },
  settingsCard: {
    gap: theme.metrics.spacingV.p12,
    backgroundColor:
      theme.colors.mode === 'dark'
        ? theme.colors.background.surface
        : theme.colors.background.surface,
    borderWidth: 1,
    borderColor:
      theme.colors.mode === 'dark' ? theme.colors.border.default : theme.colors.border.subtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  timeGrid: {
    gap: theme.metrics.spacingV.p12,
  },
}));

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { DateTimeField, Icon, Switch, Text } from '@/common/components';
import type { DateTimeFieldHandle } from '@/common/components';
import type { CalorieReminder } from '@/features/notifications/types';
import { getMealTimeWindow, reminderTimeToDate } from '@/features/notifications/utils/reminders';

export interface ReminderRowProps {
  reminder: CalorieReminder;
  title: string;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Meal reminders: picks a new time inside the meal window. */
  onTimeChange: (time: string) => void;
  /** Custom reminders: opens the editor for name, time and delete. */
  onEdit: () => void;
}

export function ReminderRow({
  reminder,
  title,
  disabled,
  onToggle,
  onTimeChange,
  onEdit,
}: ReminderRowProps) {
  const { t } = useTranslation();
  const timeFieldRef = useRef<DateTimeFieldHandle>(null);
  const isCustom = reminder.kind === 'custom';
  const mealWindow = reminder.kind === 'custom' ? null : getMealTimeWindow(reminder.kind);

  const handlePress = () => {
    if (isCustom) {
      onEdit();
      return;
    }

    timeFieldRef.current?.present();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          isCustom
            ? t('profileScreen.reminders.editA11y', { name: title })
            : t('profileScreen.reminders.changeTimeA11y', { name: title })
        }
        accessibilityValue={{ text: reminder.time }}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.text}>
          <Text variant="body" weight="medium" numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.timeRow}>
            <Text
              variant="body"
              weight="semibold"
              style={reminder.enabled ? styles.timeActive : styles.timeInactive}
            >
              {reminder.time}
            </Text>
            <Text variant="caption" color="secondary" numberOfLines={1} style={styles.caption}>
              {mealWindow
                ? t('profileScreen.reminders.mealWindow', mealWindow)
                : t('profileScreen.reminders.customTag')}
            </Text>
          </View>
        </View>
        <Icon name={isCustom ? 'create-outline' : 'time-outline'} variant="tertiary" size={18} />
      </Pressable>

      <Switch
        value={reminder.enabled}
        onValueChange={onToggle}
        disabled={disabled}
        accessibilityLabel={t('profileScreen.reminders.toggleA11y', { name: title })}
      />

      {mealWindow ? (
        <DateTimeField
          ref={timeFieldRef}
          hideTrigger
          mode="time"
          value={reminder.time}
          onChange={onTimeChange}
          title={title}
          minimumDate={reminderTimeToDate(mealWindow.start)}
          maximumDate={reminderTimeToDate(mealWindow.end)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingRight: theme.metrics.spacing.p16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingLeft: theme.metrics.spacing.p16,
    paddingRight: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  pressed: {
    backgroundColor: theme.colors.overlay.hover,
  },
  text: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.metrics.spacing.p8,
  },
  timeActive: {
    color: theme.colors.brand.primary,
  },
  timeInactive: {
    color: theme.colors.text.muted,
  },
  caption: {
    flexShrink: 1,
  },
}));

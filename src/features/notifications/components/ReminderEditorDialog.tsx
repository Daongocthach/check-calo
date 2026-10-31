import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Dialog, Input, Text } from '@/common/components';
import type { DialogAction } from '@/common/components';
import type { CalorieReminder } from '@/features/notifications/types';
import {
  CUSTOM_REMINDER_LABEL_MAX_LENGTH,
  formatReminderTime,
  reminderTimeToDate,
} from '@/features/notifications/utils/reminders';

const NEW_REMINDER_TIME = '15:00';

export interface ReminderEditorValue {
  label: string;
  time: string;
}

export interface ReminderEditorDialogProps {
  visible: boolean;
  /** The custom reminder being edited; null when adding a new one. */
  reminder: CalorieReminder | null;
  saving: boolean;
  onDismiss: () => void;
  onSave: (value: ReminderEditorValue) => void;
  onDelete: () => void;
}

export function ReminderEditorDialog({
  visible,
  reminder,
  saving,
  onDismiss,
  onSave,
  onDelete,
}: ReminderEditorDialogProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const [label, setLabel] = useState('');
  const [time, setTime] = useState(() => reminderTimeToDate(NEW_REMINDER_TIME));

  // Reset the draft each time the dialog opens for a reminder (or a new one).
  useEffect(() => {
    if (!visible) {
      return;
    }

    setLabel(reminder?.label ?? '');
    setTime(reminderTimeToDate(reminder?.time ?? NEW_REMINDER_TIME));
  }, [reminder, visible]);

  const handleSave = () => {
    onSave({
      label: label.trim() || t('profileScreen.reminders.editor.defaultName'),
      time: formatReminderTime(time),
    });
  };

  const actions: DialogAction[] = [
    ...(reminder ? [{ label: t('common.delete'), onPress: onDelete }] : []),
    { label: t('common.cancel'), onPress: onDismiss },
    { label: t('common.save'), onPress: handleSave, variant: 'primary', loading: saving },
  ];

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={
        reminder
          ? t('profileScreen.reminders.editor.editTitle')
          : t('profileScreen.reminders.editor.addTitle')
      }
      actions={actions}
      keyboardAware
    >
      <View style={styles.content}>
        <Input
          label={t('profileScreen.reminders.editor.nameLabel')}
          placeholder={t('profileScreen.reminders.editor.namePlaceholder')}
          value={label}
          onChangeText={setLabel}
          maxLength={CUSTOM_REMINDER_LABEL_MAX_LENGTH}
          returnKeyType="done"
        />
        <Text variant="label" color="secondary">
          {t('profileScreen.reminders.editor.timeLabel')}
        </Text>
        <View style={styles.pickerSurface}>
          <DatePicker
            style={styles.picker}
            date={time}
            mode="time"
            locale={i18n.language}
            onDateChange={setTime}
            theme={theme.colors.mode === 'dark' ? 'dark' : 'light'}
            dividerColor={theme.colors.border.default}
            buttonColor={theme.colors.brand.primary}
          />
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    gap: theme.metrics.spacingV.p8,
  },
  pickerSurface: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
    alignItems: 'center',
  },
  picker: {
    alignSelf: 'center',
  },
}));

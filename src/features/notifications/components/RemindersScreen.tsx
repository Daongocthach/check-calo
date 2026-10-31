import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icon, ScreenContainer, Text } from '@/common/components';
import {
  getStoredCalorieReminders,
  requestCalorieReminderPermissions,
  saveCalorieReminders,
  syncCalorieReminderSchedule,
} from '@/features/notifications/services/calorieReminderService';
import type { CalorieReminder } from '@/features/notifications/types';
import {
  clampMealReminderTime,
  createCustomReminderId,
  MAX_CALORIE_REMINDERS,
  sortRemindersByTime,
} from '@/features/notifications/utils/reminders';
import { toast } from '@/utils/toast';
import { ReminderEditorDialog } from './ReminderEditorDialog';
import type { ReminderEditorValue } from './ReminderEditorDialog';
import { ReminderRow } from './ReminderRow';

interface EditorState {
  visible: boolean;
  reminder: CalorieReminder | null;
}

export function RemindersScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [reminders, setReminders] = useState(getStoredCalorieReminders);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ visible: false, reminder: null });
  const sortedReminders = useMemo(() => sortRemindersByTime(reminders), [reminders]);
  const canAddReminder = reminders.length < MAX_CALORIE_REMINDERS;

  /** Saves and reschedules; asks for permission first when the change turns a reminder on. */
  const applyReminders = useCallback(
    async (nextReminders: CalorieReminder[], needsPermission: boolean) => {
      setIsUpdating(true);

      try {
        if (needsPermission) {
          const permissions = await requestCalorieReminderPermissions();

          if (!permissions.granted) {
            toast.error(t('profileScreen.reminders.permissionDenied'));
            return false;
          }
        }

        setReminders(nextReminders);
        saveCalorieReminders(nextReminders);
        await syncCalorieReminderSchedule(nextReminders);
        return true;
      } catch {
        toast.error(t('profileScreen.actionError'));
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [t]
  );

  const getTitle = useCallback(
    (reminder: CalorieReminder) =>
      reminder.kind === 'custom'
        ? reminder.label || t('profileScreen.reminders.editor.defaultName')
        : t(`profileScreen.reminders.${reminder.kind}`),
    [t]
  );

  const handleToggle = (id: string, enabled: boolean) => {
    void applyReminders(
      reminders.map((reminder) => (reminder.id === id ? { ...reminder, enabled } : reminder)),
      enabled
    );
  };

  const handleMealTimeChange = (reminder: CalorieReminder, nextTime: string) => {
    if (reminder.kind === 'custom') {
      return;
    }

    const normalized = clampMealReminderTime(reminder.kind, nextTime);

    void applyReminders(
      reminders.map((item) =>
        item.id === reminder.id ? { ...item, time: normalized.value } : item
      ),
      false
    ).then((applied) => {
      if (applied && normalized.adjusted) {
        toast.info(t('profileScreen.reminders.adjustedToMealWindow'));
      }
    });
  };

  const closeEditor = () => setEditor((current) => ({ ...current, visible: false }));

  const handleEditorSave = ({ label, time }: ReminderEditorValue) => {
    const editing = editor.reminder;
    const nextReminders = editing
      ? reminders.map((item) => (item.id === editing.id ? { ...item, label, time } : item))
      : [
          ...reminders,
          { id: createCustomReminderId(), kind: 'custom' as const, label, time, enabled: true },
        ];

    // A new reminder starts on, so it needs permission; an edit keeps its current switch.
    void applyReminders(nextReminders, !editing).then((applied) => {
      if (applied) {
        closeEditor();
      }
    });
  };

  const handleEditorDelete = () => {
    const editing = editor.reminder;

    if (!editing) {
      return;
    }

    void applyReminders(
      reminders.filter((item) => item.id !== editing.id),
      false
    ).then((applied) => {
      if (applied) {
        closeEditor();
      }
    });
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']} title={t('profileTab.reminders')}>
      <View style={styles.screen}>
        <Text variant="bodySmall" color="secondary">
          {t('profileScreen.reminders.subtitle')}
        </Text>

        <View style={styles.card}>
          {sortedReminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              title={getTitle(reminder)}
              disabled={isUpdating}
              onToggle={(enabled) => handleToggle(reminder.id, enabled)}
              onTimeChange={(time) => handleMealTimeChange(reminder, time)}
              onEdit={() => setEditor({ visible: true, reminder })}
            />
          ))}
        </View>

        <View style={styles.addSection}>
          <Button
            title={t('profileScreen.reminders.addButton')}
            variant="outline"
            fullWidth
            disabled={!canAddReminder || isUpdating}
            leftIcon={<Icon name="add" color={theme.colors.text.primary} size={18} />}
            onPress={() => setEditor({ visible: true, reminder: null })}
          />
          {!canAddReminder ? (
            <Text variant="caption" color="secondary" align="center">
              {t('profileScreen.reminders.limitReached', { count: MAX_CALORIE_REMINDERS })}
            </Text>
          ) : null}
        </View>
      </View>

      <ReminderEditorDialog
        visible={editor.visible}
        reminder={editor.reminder}
        saving={isUpdating}
        onDismiss={closeEditor}
        onSave={handleEditorSave}
        onDelete={handleEditorDelete}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p16,
  },
  card: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
  },
  addSection: {
    gap: theme.metrics.spacingV.p8,
  },
}));

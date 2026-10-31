import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CalorieReminder } from '@/features/notifications/types';
import {
  getDefaultCalorieReminders,
  migrateLegacyReminderSettings,
  parseReminderTime,
  parseStoredReminders,
} from '@/features/notifications/utils/reminders';
import i18n from '@/i18n/config';
import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import type { StorageKey } from '@/utils/storage';

const CALORIE_REMINDER_CHANNEL_ID = 'calorie-reminders';
const CALORIE_REMINDER_TYPE = 'calorie_reminder';

const LEGACY_REMINDER_KEYS: StorageKey[] = [
  STORAGE_KEYS.preferences.calorieRemindersEnabled,
  STORAGE_KEYS.preferences.calorieReminderBreakfastTime,
  STORAGE_KEYS.preferences.calorieReminderLunchTime,
  STORAGE_KEYS.preferences.calorieReminderDinnerTime,
];

let notificationHandlerRegistered = false;

export function registerCalorieReminderNotificationHandler() {
  if (notificationHandlerRegistered) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerRegistered = true;
}

/** Reads the reminder list, migrating the old single-switch settings the first time. */
export function getStoredCalorieReminders(): CalorieReminder[] {
  const stored = getItem<CalorieReminder[]>(STORAGE_KEYS.preferences.calorieReminders);
  const parsed = stored.success ? parseStoredReminders(stored.data) : null;

  if (parsed) {
    return parsed;
  }

  const reminders = hasLegacyReminderSettings()
    ? migrateLegacyReminderSettings({
        enabled: getLegacyValue<boolean>(STORAGE_KEYS.preferences.calorieRemindersEnabled),
        breakfastTime: getLegacyValue<string>(
          STORAGE_KEYS.preferences.calorieReminderBreakfastTime
        ),
        lunchTime: getLegacyValue<string>(STORAGE_KEYS.preferences.calorieReminderLunchTime),
        dinnerTime: getLegacyValue<string>(STORAGE_KEYS.preferences.calorieReminderDinnerTime),
      })
    : getDefaultCalorieReminders();

  saveCalorieReminders(reminders);
  LEGACY_REMINDER_KEYS.forEach((key) => removeItem(key));

  return reminders;
}

export function saveCalorieReminders(reminders: CalorieReminder[]) {
  setItem(STORAGE_KEYS.preferences.calorieReminders, reminders);
}

export async function requestCalorieReminderPermissions() {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return currentPermissions;
  }

  return Notifications.requestPermissionsAsync();
}

let reminderSyncChain: Promise<unknown> = Promise.resolve();

// Serialize schedule syncs: overlapping cancel-then-schedule runs would create duplicate reminders.
export function syncCalorieReminderSchedule(reminders?: CalorieReminder[]) {
  const run = reminderSyncChain.then(() =>
    runCalorieReminderScheduleSync(reminders ?? getStoredCalorieReminders())
  );
  reminderSyncChain = run.catch(() => undefined);
  return run;
}

async function runCalorieReminderScheduleSync(reminders: CalorieReminder[]) {
  await cancelCalorieReminderNotifications();

  const enabledReminders = reminders.filter((reminder) => reminder.enabled);

  if (enabledReminders.length === 0) {
    return reminders;
  }

  await ensureNotificationChannel();

  for (const reminder of enabledReminders) {
    const { hour, minute } = parseReminderTime(reminder.time);

    await Notifications.scheduleNotificationAsync({
      content: {
        ...getReminderContent(reminder),
        sound: 'default',
        data: {
          type: CALORIE_REMINDER_TYPE,
          screen: 'add',
          slot: reminder.kind,
          reminderId: reminder.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: CALORIE_REMINDER_CHANNEL_ID,
        hour,
        minute,
      },
    });
  }

  return reminders;
}

function getReminderContent(reminder: CalorieReminder) {
  if (reminder.kind === 'custom') {
    return {
      title: reminder.label || i18n.t('profileScreen.reminders.editor.defaultName'),
      body: i18n.t('profileScreen.reminders.notifications.custom.body'),
    };
  }

  return {
    title: i18n.t(`profileScreen.reminders.notifications.${reminder.kind}.title`),
    body: i18n.t(`profileScreen.reminders.notifications.${reminder.kind}.body`),
  };
}

export async function initializeCalorieReminderNotifications() {
  registerCalorieReminderNotificationHandler();

  const reminders = getStoredCalorieReminders();

  if (!reminders.some((reminder) => reminder.enabled)) {
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return;
  }

  await syncCalorieReminderSchedule(reminders);
}

export function isCalorieReminderResponse(
  response: Notifications.NotificationResponse | null | undefined
) {
  return response?.notification.request.content.data?.type === CALORIE_REMINDER_TYPE;
}

async function cancelCalorieReminderNotifications() {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  const calorieReminderIds = scheduledNotifications
    .filter((notification) => notification.content.data?.type === CALORIE_REMINDER_TYPE)
    .map((notification) => notification.identifier);

  await Promise.all(
    calorieReminderIds.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );
}

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(CALORIE_REMINDER_CHANNEL_ID, {
    name: i18n.t('profileScreen.reminders.channelName'),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

function hasLegacyReminderSettings() {
  return LEGACY_REMINDER_KEYS.some((key) => {
    const result = getItem(key);
    return result.success && result.data !== null;
  });
}

function getLegacyValue<T extends string | boolean>(key: StorageKey): T | null {
  const result = getItem<T>(key);
  return result.success ? (result.data ?? null) : null;
}

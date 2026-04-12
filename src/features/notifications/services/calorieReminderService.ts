import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/i18n/config';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import type { StorageKey } from '@/utils/storage';

const CALORIE_REMINDER_CHANNEL_ID = 'calorie-reminders';
const CALORIE_REMINDER_TYPE = 'calorie_reminder';

export interface CalorieReminderSettings {
  enabled: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
}

type ReminderSlot = 'breakfast' | 'lunch' | 'dinner';

interface ReminderSchedule {
  slot: ReminderSlot;
  time: string;
}

const DEFAULT_CALORIE_REMINDER_SETTINGS: CalorieReminderSettings = {
  enabled: false,
  breakfastTime: '08:00',
  lunchTime: '12:00',
  dinnerTime: '19:00',
};

const CALORIE_REMINDER_SCHEDULES: ReminderSchedule[] = [
  { slot: 'breakfast', time: DEFAULT_CALORIE_REMINDER_SETTINGS.breakfastTime },
  { slot: 'lunch', time: DEFAULT_CALORIE_REMINDER_SETTINGS.lunchTime },
  { slot: 'dinner', time: DEFAULT_CALORIE_REMINDER_SETTINGS.dinnerTime },
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

export function getDefaultCalorieReminderSettings(): CalorieReminderSettings {
  return DEFAULT_CALORIE_REMINDER_SETTINGS;
}

export function hydrateCalorieReminderSettings() {
  ensureDefaultStringValue(
    STORAGE_KEYS.preferences.calorieReminderBreakfastTime,
    DEFAULT_CALORIE_REMINDER_SETTINGS.breakfastTime
  );
  ensureDefaultStringValue(
    STORAGE_KEYS.preferences.calorieReminderLunchTime,
    DEFAULT_CALORIE_REMINDER_SETTINGS.lunchTime
  );
  ensureDefaultStringValue(
    STORAGE_KEYS.preferences.calorieReminderDinnerTime,
    DEFAULT_CALORIE_REMINDER_SETTINGS.dinnerTime
  );
  ensureDefaultBooleanValue(
    STORAGE_KEYS.preferences.calorieRemindersEnabled,
    DEFAULT_CALORIE_REMINDER_SETTINGS.enabled
  );
}

export function getStoredCalorieReminderSettings(): CalorieReminderSettings {
  return {
    enabled: getStoredBoolean(
      STORAGE_KEYS.preferences.calorieRemindersEnabled,
      DEFAULT_CALORIE_REMINDER_SETTINGS.enabled
    ),
    breakfastTime: getStoredString(
      STORAGE_KEYS.preferences.calorieReminderBreakfastTime,
      DEFAULT_CALORIE_REMINDER_SETTINGS.breakfastTime
    ),
    lunchTime: getStoredString(
      STORAGE_KEYS.preferences.calorieReminderLunchTime,
      DEFAULT_CALORIE_REMINDER_SETTINGS.lunchTime
    ),
    dinnerTime: getStoredString(
      STORAGE_KEYS.preferences.calorieReminderDinnerTime,
      DEFAULT_CALORIE_REMINDER_SETTINGS.dinnerTime
    ),
  };
}

export async function requestCalorieReminderPermissions() {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return currentPermissions;
  }

  return Notifications.requestPermissionsAsync();
}

export async function syncCalorieReminderSchedule(
  inputSettings?: Partial<CalorieReminderSettings>
) {
  const settings = {
    ...getStoredCalorieReminderSettings(),
    ...inputSettings,
  };

  await cancelCalorieReminderNotifications();

  if (!settings.enabled) {
    return settings;
  }

  await ensureNotificationChannel();

  const schedules: ReminderSchedule[] = [
    { slot: 'breakfast', time: settings.breakfastTime },
    { slot: 'lunch', time: settings.lunchTime },
    { slot: 'dinner', time: settings.dinnerTime },
  ];

  for (const schedule of schedules) {
    const { hour, minute } = parseTimeString(schedule.time);
    const titleKey = `profileScreen.reminders.notifications.${schedule.slot}.title` as const;
    const bodyKey = `profileScreen.reminders.notifications.${schedule.slot}.body` as const;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t(titleKey),
        body: i18n.t(bodyKey),
        sound: 'default',
        data: {
          type: CALORIE_REMINDER_TYPE,
          screen: 'add',
          slot: schedule.slot,
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

  return settings;
}

export async function initializeCalorieReminderNotifications() {
  hydrateCalorieReminderSettings();
  registerCalorieReminderNotificationHandler();

  const settings = getStoredCalorieReminderSettings();

  if (!settings.enabled) {
    return;
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return;
  }

  await syncCalorieReminderSchedule(settings);
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

function ensureDefaultStringValue(key: StorageKey, defaultValue: string) {
  const existingValue = getItem<string>(key);

  if (existingValue.success && existingValue.data) {
    return;
  }

  setItem(key, defaultValue);
}

function ensureDefaultBooleanValue(key: StorageKey, defaultValue: boolean) {
  const existingValue = getItem<boolean>(key);

  if (existingValue.success && existingValue.data !== null) {
    return;
  }

  setItem(key, defaultValue);
}

function getStoredString(key: StorageKey, fallbackValue: string) {
  const result = getItem<string>(key);
  return result.success && result.data ? result.data : fallbackValue;
}

function getStoredBoolean(key: StorageKey, fallbackValue: boolean) {
  const result = getItem<boolean>(key);
  return result.success && typeof result.data === 'boolean' ? result.data : fallbackValue;
}

function parseTimeString(value: string) {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  const hour = Number.isNaN(hourValue) ? 0 : hourValue;
  const minute = Number.isNaN(minuteValue) ? 0 : minuteValue;

  return { hour, minute };
}

export { CALORIE_REMINDER_SCHEDULES };

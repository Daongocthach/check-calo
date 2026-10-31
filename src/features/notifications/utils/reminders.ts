import type {
  CalorieReminder,
  LegacyCalorieReminderSettings,
  MealReminderSlot,
} from '@/features/notifications/types';

export const MEAL_REMINDER_SLOTS: MealReminderSlot[] = ['breakfast', 'lunch', 'dinner'];

/** Meals plus custom reminders; well under iOS's 64 pending-notification cap. */
export const MAX_CALORIE_REMINDERS = 10;

export const CUSTOM_REMINDER_LABEL_MAX_LENGTH = 40;

const DEFAULT_MEAL_TIMES: Record<MealReminderSlot, string> = {
  breakfast: '08:00',
  lunch: '12:00',
  dinner: '19:00',
};

const MEAL_TIME_WINDOWS: Record<MealReminderSlot, { start: string; end: string }> = {
  breakfast: { start: '05:00', end: '10:30' },
  lunch: { start: '10:30', end: '14:30' },
  dinner: { start: '17:00', end: '22:00' },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isMealReminderSlot(value: unknown): value is MealReminderSlot {
  return value === 'breakfast' || value === 'lunch' || value === 'dinner';
}

export function isValidReminderTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function getMealTimeWindow(slot: MealReminderSlot) {
  return MEAL_TIME_WINDOWS[slot];
}

export function createDefaultMealReminder(slot: MealReminderSlot): CalorieReminder {
  return { id: slot, kind: slot, time: DEFAULT_MEAL_TIMES[slot], enabled: false };
}

export function getDefaultCalorieReminders(): CalorieReminder[] {
  return MEAL_REMINDER_SLOTS.map(createDefaultMealReminder);
}

/** Turns the old single switch + three times into per-meal reminders that keep both. */
export function migrateLegacyReminderSettings(
  legacy: LegacyCalorieReminderSettings
): CalorieReminder[] {
  const enabled = legacy.enabled === true;
  const times: Record<MealReminderSlot, string | null> = {
    breakfast: legacy.breakfastTime,
    lunch: legacy.lunchTime,
    dinner: legacy.dinnerTime,
  };

  return MEAL_REMINDER_SLOTS.map((slot) => {
    const time = times[slot];

    return {
      ...createDefaultMealReminder(slot),
      time: isValidReminderTime(time)
        ? clampMealReminderTime(slot, time).value
        : DEFAULT_MEAL_TIMES[slot],
      enabled,
    };
  });
}

function parseReminder(value: unknown): CalorieReminder | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== 'string' ||
    !isValidReminderTime(record.time) ||
    typeof record.enabled !== 'boolean'
  ) {
    return null;
  }

  if (record.kind === 'custom') {
    return {
      id: record.id,
      kind: 'custom',
      label: typeof record.label === 'string' ? record.label : '',
      time: record.time,
      enabled: record.enabled,
    };
  }

  if (isMealReminderSlot(record.kind) && record.id === record.kind) {
    return { id: record.id, kind: record.kind, time: record.time, enabled: record.enabled };
  }

  return null;
}

/** Validates stored JSON and guarantees exactly one reminder per meal. Null when unreadable. */
export function parseStoredReminders(value: unknown): CalorieReminder[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value
    .map(parseReminder)
    .filter((reminder): reminder is CalorieReminder => reminder !== null);
  const meals = MEAL_REMINDER_SLOTS.map(
    (slot) => parsed.find((reminder) => reminder.id === slot) ?? createDefaultMealReminder(slot)
  );
  const seenIds = new Set<string>();
  const customs = parsed.filter((reminder) => {
    if (reminder.kind !== 'custom' || seenIds.has(reminder.id)) {
      return false;
    }

    seenIds.add(reminder.id);
    return true;
  });

  return [...meals, ...customs].slice(0, MAX_CALORIE_REMINDERS);
}

export function sortRemindersByTime(reminders: CalorieReminder[]) {
  return [...reminders].sort((left, right) => left.time.localeCompare(right.time));
}

export function clampMealReminderTime(slot: MealReminderSlot, time: string) {
  const { start, end } = MEAL_TIME_WINDOWS[slot];

  if (time < start) {
    return { value: start, adjusted: true };
  }

  if (time > end) {
    return { value: end, adjusted: true };
  }

  return { value: time, adjusted: false };
}

export function createCustomReminderId(now: number = Date.now()) {
  return `custom-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseReminderTime(value: string) {
  const [hourValue, minuteValue] = value.split(':').map(Number);

  return {
    hour: Number.isNaN(hourValue) ? 0 : hourValue,
    minute: Number.isNaN(minuteValue) ? 0 : minuteValue,
  };
}

export function reminderTimeToDate(value: string) {
  const { hour, minute } = parseReminderTime(value);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function formatReminderTime(value: Date) {
  return `${value.getHours().toString().padStart(2, '0')}:${value
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

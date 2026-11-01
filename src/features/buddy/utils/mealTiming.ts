import type { CalorieReminder, MealReminderSlot } from '@/features/notifications/types';
import { getMealTimeWindow, MEAL_REMINDER_SLOTS } from '@/features/notifications/utils/reminders';
import type { DayMeals } from '../types';

/** Minutes since midnight, start inclusive and end exclusive. */
export interface MinuteWindow {
  start: number;
  end: number;
}

export type OnTimeWindows = Record<MealReminderSlot, MinuteWindow>;

/** Usual meal times for someone without meal reminders. */
const DEFAULT_ON_TIME: Record<MealReminderSlot, { start: string; end: string }> = {
  breakfast: { start: '06:00', end: '09:30' },
  lunch: { start: '11:00', end: '13:30' },
  dinner: { start: '17:30', end: '20:30' },
};

/** A meal within this many minutes of its reminder is on time. */
const REMINDER_TOLERANCE_MINUTES = 60;

/** Eating from 22:00 until 04:00 counts as late at night. */
const LATE_NIGHT = { start: 22 * 60, end: 4 * 60 } as const;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesOfDay(consumedAt: string) {
  const date = new Date(consumedAt);
  return date.getHours() * 60 + date.getMinutes();
}

function contains(window: MinuteWindow, minutes: number) {
  return minutes >= window.start && minutes < window.end;
}

/** On-time windows: around the meal reminder the user set, else the usual meal times. */
export function getOnTimeWindows(
  reminders: Pick<CalorieReminder, 'kind' | 'time' | 'enabled'>[]
): OnTimeWindows {
  const windows = {} as OnTimeWindows;

  for (const slot of MEAL_REMINDER_SLOTS) {
    const reminder = reminders.find((item) => item.kind === slot && item.enabled);

    windows[slot] = reminder
      ? {
          start: toMinutes(reminder.time) - REMINDER_TOLERANCE_MINUTES,
          end: toMinutes(reminder.time) + REMINDER_TOLERANCE_MINUTES + 1,
        }
      : {
          start: toMinutes(DEFAULT_ON_TIME[slot].start),
          end: toMinutes(DEFAULT_ON_TIME[slot].end) + 1,
        };
  }

  return windows;
}

/** The main meal a time falls in, using the app's meal windows; null for snacks. */
export function getMainMeal(consumedAt: string): MealReminderSlot | null {
  const minutes = minutesOfDay(consumedAt);

  return (
    MEAL_REMINDER_SLOTS.find((slot) => {
      const window = getMealTimeWindow(slot);
      return contains({ start: toMinutes(window.start), end: toMinutes(window.end) }, minutes);
    }) ?? null
  );
}

/** Main meals, how many were on time (judged by each meal's first entry) and late eating. */
export function summarizeDayMeals(consumedAts: string[], onTime: OnTimeWindows): DayMeals {
  const firstBySlot = new Map<MealReminderSlot, number>();
  let lateNight = false;

  for (const consumedAt of consumedAts) {
    const minutes = minutesOfDay(consumedAt);
    const slot = getMainMeal(consumedAt);

    if (minutes >= LATE_NIGHT.start || minutes < LATE_NIGHT.end) {
      lateNight = true;
    }

    if (slot && minutes < (firstBySlot.get(slot) ?? Infinity)) {
      firstBySlot.set(slot, minutes);
    }
  }

  return {
    main: firstBySlot.size,
    onTime: [...firstBySlot].filter(([slot, minutes]) => contains(onTime[slot], minutes)).length,
    lateNight,
  };
}

/** {@link summarizeDayMeals} for every entry date. */
export function summarizeMealsByDate(
  entries: { date: string; consumedAt: string }[],
  onTime: OnTimeWindows
) {
  const timesByDate = new Map<string, string[]>();

  for (const entry of entries) {
    timesByDate.set(entry.date, [...(timesByDate.get(entry.date) ?? []), entry.consumedAt]);
  }

  return new Map([...timesByDate].map(([date, times]) => [date, summarizeDayMeals(times, onTime)]));
}

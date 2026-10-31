export type MealReminderSlot = 'breakfast' | 'lunch' | 'dinner';

export type CalorieReminderKind = MealReminderSlot | 'custom';

/** One daily reminder. Meal reminders use their slot as id; custom ones get a generated id. */
export interface CalorieReminder {
  id: string;
  kind: CalorieReminderKind;
  /** Name the user typed; only custom reminders have one. */
  label?: string;
  /** Local time as `HH:mm`. */
  time: string;
  enabled: boolean;
}

export interface LegacyCalorieReminderSettings {
  enabled: boolean | null;
  breakfastTime: string | null;
  lunchTime: string | null;
  dinnerTime: string | null;
}

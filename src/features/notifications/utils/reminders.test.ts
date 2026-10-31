import { describe, expect, it } from '@jest/globals';
import {
  clampMealReminderTime,
  MAX_CALORIE_REMINDERS,
  migrateLegacyReminderSettings,
  parseStoredReminders,
  sortRemindersByTime,
} from './reminders';

describe('reminder utils', () => {
  it('carries the old shared switch and times over to each meal', () => {
    expect(
      migrateLegacyReminderSettings({
        enabled: true,
        breakfastTime: '07:15',
        lunchTime: '12:30',
        dinnerTime: 'bad',
      })
    ).toEqual([
      { id: 'breakfast', kind: 'breakfast', time: '07:15', enabled: true },
      { id: 'lunch', kind: 'lunch', time: '12:30', enabled: true },
      { id: 'dinner', kind: 'dinner', time: '19:00', enabled: true },
    ]);
  });

  it('keeps migrated meal times inside their window', () => {
    const [breakfast] = migrateLegacyReminderSettings({
      enabled: null,
      breakfastTime: '04:00',
      lunchTime: null,
      dinnerTime: null,
    });

    expect(breakfast).toEqual({
      id: 'breakfast',
      kind: 'breakfast',
      time: '05:00',
      enabled: false,
    });
  });

  it('rejects stored data that is not a list', () => {
    expect(parseStoredReminders(null)).toBeNull();
    expect(parseStoredReminders('x')).toBeNull();
  });

  it('restores missing meals and drops broken or duplicate entries', () => {
    const reminders = parseStoredReminders([
      { id: 'lunch', kind: 'lunch', time: '11:00', enabled: true },
      { id: 'custom-a', kind: 'custom', label: 'Snack', time: '15:00', enabled: true },
      { id: 'custom-a', kind: 'custom', label: 'Copy', time: '16:00', enabled: true },
      { id: 'custom-b', kind: 'custom', time: '25:00', enabled: true },
      { id: 'other', kind: 'breakfast', time: '08:00', enabled: true },
    ]);

    expect(reminders).toEqual([
      { id: 'breakfast', kind: 'breakfast', time: '08:00', enabled: false },
      { id: 'lunch', kind: 'lunch', time: '11:00', enabled: true },
      { id: 'dinner', kind: 'dinner', time: '19:00', enabled: false },
      { id: 'custom-a', kind: 'custom', label: 'Snack', time: '15:00', enabled: true },
    ]);
  });

  it('caps the list at the reminder limit', () => {
    const customs = Array.from({ length: 20 }, (_, index) => ({
      id: `custom-${index}`,
      kind: 'custom',
      label: `R${index}`,
      time: '09:00',
      enabled: false,
    }));

    expect(parseStoredReminders(customs)).toHaveLength(MAX_CALORIE_REMINDERS);
  });

  it('clamps meal times to the meal window', () => {
    expect(clampMealReminderTime('dinner', '23:00')).toEqual({ value: '22:00', adjusted: true });
    expect(clampMealReminderTime('lunch', '12:00')).toEqual({ value: '12:00', adjusted: false });
  });

  it('sorts reminders by time of day', () => {
    const sorted = sortRemindersByTime([
      { id: 'dinner', kind: 'dinner', time: '19:00', enabled: true },
      { id: 'custom-a', kind: 'custom', label: 'Snack', time: '15:30', enabled: true },
      { id: 'breakfast', kind: 'breakfast', time: '08:00', enabled: true },
    ]);

    expect(sorted.map((reminder) => reminder.id)).toEqual(['breakfast', 'custom-a', 'dinner']);
  });
});

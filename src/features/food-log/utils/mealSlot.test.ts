import { describe, expect, it } from '@jest/globals';
import type { FoodEntry } from '../types';
import { getMealSlot, groupEntriesByMealSlot } from './mealSlot';

function entry(
  id: string,
  hour: number,
  calories: number,
  imageUri: string | null = null
): FoodEntry {
  const consumedAt = new Date(2026, 9, 25, hour, 15).toISOString();

  return {
    id,
    mealName: id,
    quantityLabel: '',
    totalCalories: calories,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    notes: null,
    imageUri,
    consumedAt,
    entryDate: '2026-10-25',
    createdAt: consumedAt,
    updatedAt: consumedAt,
    isRecent: false,
  };
}

describe('getMealSlot', () => {
  it('maps local hours to meal slots', () => {
    expect(getMealSlot(new Date(2026, 0, 1, 7))).toBe('breakfast');
    expect(getMealSlot(new Date(2026, 0, 1, 12))).toBe('lunch');
    expect(getMealSlot(new Date(2026, 0, 1, 19))).toBe('dinner');
    expect(getMealSlot(new Date(2026, 0, 1, 16))).toBe('snack');
    expect(getMealSlot(new Date(2026, 0, 1, 23))).toBe('snack');
  });
});

describe('groupEntriesByMealSlot', () => {
  it('groups in slot order, sums calories and prefers an entry with a photo as cover', () => {
    const groups = groupEntriesByMealSlot([
      entry('dinner', 19, 600),
      entry('coffee', 8, 120),
      entry('pho', 7, 450.4, 'file://pho.jpg'),
    ]);

    expect(groups.map((group) => group.slot)).toEqual(['breakfast', 'dinner']);
    expect(groups[0].totalCalories).toBe(570);
    expect(groups[0].entries.map((item) => item.id)).toEqual(['pho', 'coffee']);
    expect(groups[0].coverEntry.id).toBe('pho');
  });

  it('returns no groups for an empty day', () => {
    expect(groupEntriesByMealSlot([])).toEqual([]);
  });
});

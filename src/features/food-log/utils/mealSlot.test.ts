import { describe, expect, it } from '@jest/globals';
import { getMealSlot } from './mealSlot';

describe('getMealSlot', () => {
  it('maps local hours to meal slots', () => {
    expect(getMealSlot(new Date(2026, 0, 1, 7))).toBe('breakfast');
    expect(getMealSlot(new Date(2026, 0, 1, 12))).toBe('lunch');
    expect(getMealSlot(new Date(2026, 0, 1, 19))).toBe('dinner');
    expect(getMealSlot(new Date(2026, 0, 1, 16))).toBe('snack');
    expect(getMealSlot(new Date(2026, 0, 1, 23))).toBe('snack');
  });
});

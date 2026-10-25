import { describe, expect, it } from '@jest/globals';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { formatDateKey } from '@/utils/date';
import { buildMonthlyBars, getPeriodRange } from './periods';

function point(date: string, consumedCalories: number): NutritionTrendPoint {
  return {
    date,
    label: date,
    calorieTarget: 2000,
    consumedCalories,
    remainingCalories: 2000 - consumedCalories,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

describe('getPeriodRange', () => {
  const sunday = new Date(2026, 9, 25, 15);

  it('uses a Monday-based week', () => {
    const range = getPeriodRange('week', sunday);
    expect(formatDateKey(range.start)).toBe('2026-10-19');
    expect(formatDateKey(range.end)).toBe('2026-10-25');
  });

  it('covers the whole month and year', () => {
    const month = getPeriodRange('month', sunday);
    expect(formatDateKey(month.start)).toBe('2026-10-01');
    expect(formatDateKey(month.end)).toBe('2026-10-31');

    const year = getPeriodRange('year', sunday);
    expect(formatDateKey(year.start)).toBe('2026-01-01');
    expect(formatDateKey(year.end)).toBe('2026-12-31');
  });
});

describe('buildMonthlyBars', () => {
  it('averages calories over logged days only', () => {
    const bars = buildMonthlyBars(
      [point('2026-10-01', 1800), point('2026-10-02', 0), point('2026-10-03', 2200)],
      new Date(2026, 9, 25),
      'en-US'
    );

    expect(bars).toHaveLength(12);
    expect(bars[9].value).toBe(2000);
    expect(bars[9].isCurrent).toBe(true);
    expect(bars[0].value).toBe(0);
  });
});

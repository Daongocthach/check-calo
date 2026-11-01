import { describe, expect, it } from '@jest/globals';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { buildCalorieChart, getChartDateRange, getChartWeekStart } from './calorieChart';

function point(
  date: string,
  kcal: number,
  grams: { protein?: number; carbs?: number; fat?: number } = {},
  calorieTarget = 2000
): NutritionTrendPoint {
  return {
    date,
    calorieTarget,
    consumedCalories: kcal,
    proteinGrams: grams.protein ?? 0,
    carbsGrams: grams.carbs ?? 0,
    fatGrams: grams.fat ?? 0,
  } as NutritionTrendPoint;
}

describe('getChartWeekStart', () => {
  it('starts weeks on Monday', () => {
    expect(getChartWeekStart('2026-11-01')).toBe('2026-10-26');
    expect(getChartWeekStart('2026-10-26')).toBe('2026-10-26');
  });
});

describe('getChartDateRange', () => {
  it('covers seven days or a whole year', () => {
    expect(getChartDateRange('week', '2026-10-26')).toEqual({
      start: '2026-10-26',
      end: '2026-11-01',
    });
    expect(getChartDateRange('year', '2026-06-15')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });
});

describe('buildCalorieChart', () => {
  it('stacks macro calories and puts the rest under other', () => {
    const { bars } = buildCalorieChart(
      'week',
      [point('2026-10-26', 600, { protein: 30, carbs: 50, fat: 20 })],
      '2026-11-01'
    );

    expect(bars[0]).toMatchObject({
      kcal: 600,
      proteinKcal: 120,
      carbsKcal: 200,
      fatKcal: 180,
      otherKcal: 100,
    });
  });

  it('shrinks the stacks when the macros add up to more than was logged', () => {
    const [bar] = buildCalorieChart(
      'week',
      [point('2026-10-26', 400, { carbs: 125 })],
      '2026-11-01'
    ).bars;

    expect(bar.carbsKcal).toBe(400);
    expect(bar.otherKcal).toBe(0);
  });

  it('marks days after today as future', () => {
    const { bars } = buildCalorieChart(
      'week',
      [point('2026-10-31', 0), point('2026-11-01', 0), point('2026-11-02', 0)],
      '2026-11-01'
    );

    expect(bars.map((bar) => bar.future)).toEqual([false, false, true]);
  });

  it('averages a month over its logged days only', () => {
    const { bars } = buildCalorieChart(
      'year',
      [point('2026-01-01', 1800), point('2026-01-02', 0), point('2026-01-03', 2200)],
      '2026-11-01'
    );

    expect(bars).toHaveLength(12);
    expect(bars[0]).toMatchObject({ key: '2026-01', kcal: 2000, loggedDays: 2 });
    expect(bars[10].future).toBe(false);
    expect(bars[11].future).toBe(true);
  });

  it('averages the target over logged days, else uses the latest one', () => {
    expect(
      buildCalorieChart(
        'week',
        [point('2026-10-26', 1500, {}, 1800), point('2026-10-27', 1500, {}, 2200)],
        '2026-11-01'
      ).target
    ).toBe(2000);
    expect(
      buildCalorieChart(
        'week',
        [point('2026-10-26', 0, {}, 1800), point('2026-10-27', 0, {}, 1900)],
        '2026-11-01'
      ).target
    ).toBe(1900);
  });
});

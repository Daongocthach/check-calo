import { describe, expect, it } from '@jest/globals';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import type { WeightGoal } from '../types';
import { calculateGoalProgress } from './goalProgress';

const MAINTENANCE = 2000;

function day(date: string, consumedCalories: number): NutritionTrendPoint {
  return {
    date,
    label: date,
    calorieTarget: 1600,
    goalMode: 'lose',
    consumedCalories,
    remainingCalories: 1600 - consumedCalories,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    nutrients: EMPTY_NUTRIENTS,
  };
}

function goal(overrides: Partial<WeightGoal>): WeightGoal {
  return {
    id: 'goal-1',
    mode: 'lose',
    targetKg: 3,
    targetKcalDelta: 23100,
    targetDays: 90,
    startWeightKg: 70,
    targetWeightKg: 67,
    monthlyRateKg: 1,
    status: 'active',
    startedAt: '2026-10-01T08:00:00',
    completedAt: null,
    createdAt: '2026-10-01T08:00:00',
    updatedAt: '2026-10-01T08:00:00',
    ...overrides,
  };
}

describe('calculateGoalProgress', () => {
  it('sums the deficit of logged days and ignores days over maintenance', () => {
    const progress = calculateGoalProgress(
      goal({}),
      [day('2026-10-01', 1600), day('2026-10-02', 2300), day('2026-10-03', 0)],
      MAINTENANCE,
      '2026-10-03'
    );

    expect(progress).toMatchObject({
      unit: 'kcal',
      progressValue: 400,
      targetValue: 23100,
      remainingValue: 22700,
      progressPercent: 2,
      completed: false,
      expectedEndDate: '2026-12-30',
    });
  });

  it('completes a gain goal once the surplus reaches the target', () => {
    const progress = calculateGoalProgress(
      goal({ mode: 'gain', targetKcalDelta: 500 }),
      [day('2026-10-01', 2400), day('2026-10-02', 2300)],
      MAINTENANCE,
      '2026-10-02'
    );

    expect(progress).toMatchObject({
      progressValue: 700,
      remainingValue: 0,
      progressPercent: 100,
      completed: true,
    });
  });

  it('derives the calorie target from the kilograms when none was stored', () => {
    const progress = calculateGoalProgress(
      goal({ targetKcalDelta: 0, targetKg: 2 }),
      [],
      MAINTENANCE,
      '2026-10-01'
    );

    expect(progress.targetValue).toBe(15400);
  });

  it('counts days for maintain goals and completes them when the days have passed', () => {
    const maintain = goal({
      mode: 'maintain',
      targetKg: null,
      targetKcalDelta: 0,
      targetDays: 30,
      targetWeightKg: 70,
    });

    expect(calculateGoalProgress(maintain, [], MAINTENANCE, '2026-10-12')).toMatchObject({
      unit: 'days',
      progressValue: 12,
      targetValue: 30,
      remainingValue: 18,
      completed: false,
      expectedEndDate: '2026-10-31',
    });
    expect(calculateGoalProgress(maintain, [], MAINTENANCE, '2026-10-30').completed).toBe(true);
  });
});

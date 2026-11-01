import { describe, expect, it } from '@jest/globals';
import type { NutritionTrendPoint } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import type { WeightGoal, WeightGoalMode } from '../types';
import { calculateGoalProgress, getReachedMaintainMilestone } from './goalProgress';

const PROFILE = {
  displayName: 'Test',
  gender: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  monthlyWeightGoalKg: 0,
  targetWeightKg: null,
  activityLevel: 'moderate',
  maintenanceCalorieTarget: 2000,
} as const;

function day(
  date: string,
  consumedCalories: number,
  goalMode: WeightGoalMode = 'lose',
  calorieTarget = 1600
): NutritionTrendPoint {
  return {
    date,
    label: date,
    calorieTarget,
    goalMode,
    consumedCalories,
    remainingCalories: calorieTarget - consumedCalories,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    proteinTargetGrams: 0,
    carbsTargetGrams: 0,
    fatTargetGrams: 0,
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
    endedAt: null,
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
      PROFILE,
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
      PROFILE,
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
      PROFILE,
      '2026-10-01'
    );

    expect(progress.targetValue).toBe(15400);
  });

  it('counts on-target days for maintain goals and never completes them', () => {
    const maintain = goal({
      mode: 'maintain',
      targetKg: null,
      targetKcalDelta: 0,
      targetDays: 0,
      targetWeightKg: 70,
    });
    const summaries = [
      day('2026-09-30', 2000, 'maintain', 2000),
      day('2026-10-01', 2000, 'maintain', 2000),
      day('2026-10-02', 2600, 'maintain', 2000),
      day('2026-10-08', 1950, 'maintain', 2000),
      day('2026-10-09', 0, 'maintain', 2000),
      day('2026-10-10', 2100, 'maintain', 2000),
    ];

    expect(calculateGoalProgress(maintain, summaries, PROFILE, '2026-10-12')).toMatchObject({
      unit: 'days',
      progressValue: 3,
      targetValue: 12,
      progressPercent: 25,
      completed: false,
      expectedEndDate: null,
      recent: { onTargetDays: 2, days: 7 },
    });
  });

  it('shows the days since the start while a maintain goal is under a week old', () => {
    const maintain = goal({ mode: 'maintain', targetKg: null, targetKcalDelta: 0, targetDays: 0 });

    expect(
      calculateGoalProgress(
        maintain,
        [day('2026-10-02', 2000, 'maintain', 2000)],
        PROFILE,
        '2026-10-03'
      ).recent
    ).toEqual({ onTargetDays: 1, days: 3 });
  });
});

describe('getReachedMaintainMilestone', () => {
  it('returns the highest milestone reached', () => {
    expect(getReachedMaintainMilestone(6)).toBeNull();
    expect(getReachedMaintainMilestone(7)).toBe(7);
    expect(getReachedMaintainMilestone(45)).toBe(30);
    expect(getReachedMaintainMilestone(400)).toBe(365);
  });
});

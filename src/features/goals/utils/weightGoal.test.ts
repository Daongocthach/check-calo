import { describe, expect, it } from '@jest/globals';
import type { WeightGoal, WeightLog } from '../types';
import {
  calculateTrendWeight,
  calculateWeightGoalProgress,
  estimateGoalEndDate,
} from './weightGoal';

function log(date: string, weightKg: number): WeightLog {
  return { date, weightKg, createdAt: `${date}T07:00:00`, updatedAt: `${date}T07:00:00` };
}

function goal(overrides: Partial<WeightGoal>): WeightGoal {
  return {
    id: 'goal-1',
    mode: 'lose',
    targetKg: 5,
    targetKcalDelta: 0,
    targetDays: 0,
    startWeightKg: 80,
    targetWeightKg: 75,
    monthlyRateKg: 1,
    status: 'active',
    startedAt: '2026-01-01T08:00:00',
    completedAt: null,
    createdAt: '2026-01-01T08:00:00',
    updatedAt: '2026-01-01T08:00:00',
    ...overrides,
  };
}

describe('calculateTrendWeight', () => {
  const logs = [
    log('2026-01-01', 80),
    log('2026-01-05', 79),
    log('2026-01-10', 78),
    log('2026-01-12', 77.6),
  ];

  it('averages the week ending at the latest weigh-in', () => {
    expect(calculateTrendWeight(logs)).toBe(77.8);
  });

  it('ignores weigh-ins before the start date', () => {
    expect(calculateTrendWeight(logs, '2026-01-13')).toBeNull();
  });
});

describe('estimateGoalEndDate', () => {
  it('spreads the change over the monthly rate', () => {
    expect(estimateGoalEndDate('2026-01-01', 80, 75, 1)).toBe('2026-05-31');
  });
});

describe('calculateWeightGoalProgress', () => {
  it('measures a loss goal in kilograms', () => {
    const progress = calculateWeightGoalProgress(
      goal({}),
      [log('2026-01-10', 78), log('2026-01-12', 77.6)],
      '2026-01-12'
    );

    expect(progress.unit).toBe('kg');
    expect(progress.progressValue).toBe(2.2);
    expect(progress.remainingValue).toBe(2.8);
    expect(progress.progressPercent).toBe(44);
    expect(progress.completed).toBe(false);
    expect(progress.weight?.expectedEndDate).toBe('2026-05-31');
  });

  it('starts from the start weight before any weigh-in', () => {
    const progress = calculateWeightGoalProgress(goal({}), [], '2026-01-02');

    expect(progress.progressValue).toBe(0);
    expect(progress.weight?.currentKg).toBe(80);
  });

  it('completes once the trend reaches the target', () => {
    const progress = calculateWeightGoalProgress(goal({}), [log('2026-04-01', 74.9)], '2026-04-01');

    expect(progress.completed).toBe(true);
    expect(progress.progressPercent).toBe(100);
  });

  it('counts gains in the other direction', () => {
    const gain = goal({ mode: 'gain', startWeightKg: 60, targetWeightKg: 63 });
    const progress = calculateWeightGoalProgress(gain, [log('2026-02-01', 61.5)], '2026-02-01');

    expect(progress.progressValue).toBe(1.5);
    expect(progress.progressPercent).toBe(50);
  });

  it('completes a maintain goal after 30 days within the band', () => {
    const maintain = goal({ mode: 'maintain', targetWeightKg: 80, monthlyRateKg: 0 });
    const held = calculateWeightGoalProgress(maintain, [log('2026-01-28', 80.6)], '2026-01-30');

    expect(held.unit).toBe('days');
    expect(held.completed).toBe(true);
  });

  it('does not complete a maintain goal without a weigh-in in the final week', () => {
    const maintain = goal({ mode: 'maintain', targetWeightKg: 80, monthlyRateKg: 0 });
    const progress = calculateWeightGoalProgress(maintain, [log('2026-01-05', 80)], '2026-02-10');

    expect(progress.completed).toBe(false);
  });

  it('does not complete a maintain goal outside the band', () => {
    const maintain = goal({ mode: 'maintain', targetWeightKg: 80, monthlyRateKg: 0 });
    const progress = calculateWeightGoalProgress(maintain, [log('2026-01-28', 81.5)], '2026-01-30');

    expect(progress.completed).toBe(false);
    expect(progress.weight?.withinBand).toBe(false);
  });
});

import { describe, expect, it } from '@jest/globals';
import type { WeightGoal, WeightLog } from '../types';
import { calculateTrendWeight, estimateGoalEndDate, getGoalEndDate } from './weightGoal';

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
    endedAt: null,
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

describe('getGoalEndDate', () => {
  it('uses the stored length when the plan has one', () => {
    expect(getGoalEndDate(goal({ targetDays: 45 }))).toBe('2026-02-15');
  });

  it('derives the length from the rate otherwise', () => {
    expect(getGoalEndDate(goal({}))).toBe('2026-05-31');
  });
});

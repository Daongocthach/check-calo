import { describe, expect, it } from '@jest/globals';
import type { WeightGoal } from '../types';
import { findSupersededActiveGoals } from './activeGoal';

function goal(overrides: Partial<WeightGoal>): WeightGoal {
  return {
    id: 'goal-1',
    mode: 'lose',
    targetKg: 4,
    targetKcalDelta: -500,
    targetDays: 90,
    startWeightKg: 70,
    targetWeightKg: 66,
    monthlyRateKg: 1.3,
    status: 'active',
    startedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    endedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('findSupersededActiveGoals', () => {
  it('keeps a single running goal', () => {
    expect(findSupersededActiveGoals([goal({})])).toEqual([]);
  });

  it('keeps the most recently changed goal running when two devices each started one', () => {
    const older = goal({ id: 'phone', updatedAt: '2026-10-05T00:00:00.000Z' });
    const newer = goal({ id: 'tablet', updatedAt: '2026-10-20T00:00:00.000Z' });

    expect(findSupersededActiveGoals([newer, older])).toEqual([older]);
  });

  it('breaks a tie on the start time', () => {
    const earlier = goal({ id: 'a', startedAt: '2026-10-01T00:00:00.000Z' });
    const later = goal({ id: 'b', startedAt: '2026-10-02T00:00:00.000Z' });

    expect(findSupersededActiveGoals([earlier, later])).toEqual([earlier]);
  });

  it('ignores goals that already stopped', () => {
    const completed = goal({
      id: 'done',
      status: 'completed',
      updatedAt: '2026-10-30T00:00:00.000Z',
    });

    expect(findSupersededActiveGoals([goal({}), completed])).toEqual([]);
  });
});

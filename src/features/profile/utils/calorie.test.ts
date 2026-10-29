import { describe, expect, it } from '@jest/globals';
import type { UserProfileInput } from '../types';
import {
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  getCalorieRange,
  getDailyCalorieGoalState,
} from './calorie';

function profile(overrides: Partial<UserProfileInput>): UserProfileInput {
  return {
    displayName: 'Test',
    gender: 'male',
    age: 30,
    heightCm: 175,
    weightKg: 80,
    monthlyWeightGoalKg: 0,
    targetWeightKg: null,
    activityLevel: 'moderate',
    ...overrides,
  };
}

describe('calculateDailyCalorieTarget', () => {
  it('uses maintenance calories when maintaining', () => {
    expect(calculateDailyCalorieTarget(profile({}))).toBe(2711);
  });

  it('subtracts the monthly rate as a daily deficit', () => {
    expect(calculateDailyCalorieTarget(profile({ monthlyWeightGoalKg: 2 }))).toBe(2198);
  });

  it('adds the monthly rate as a daily surplus', () => {
    expect(calculateDailyCalorieTarget(profile({ monthlyWeightGoalKg: -1 }))).toBe(2968);
  });

  it('caps the surplus at 500 kcal', () => {
    expect(calculateDailyCalorieTarget(profile({ monthlyWeightGoalKg: -2 }))).toBe(3211);
  });

  it('never drops below the calorie floor', () => {
    const small = profile({
      gender: 'female',
      age: 25,
      heightCm: 155,
      weightKg: 50,
      activityLevel: 'sedentary',
      monthlyWeightGoalKg: 2,
    });

    expect(calculateDailyCalorieTarget(small)).toBe(1200);
  });
});

describe('calculateMacroTargets', () => {
  it('sizes protein by goal from the weight at BMI 25 when above it', () => {
    expect(calculateMacroTargets(profile({ monthlyWeightGoalKg: 1 })).proteinTargetGrams).toBe(153);
    expect(calculateMacroTargets(profile({ monthlyWeightGoalKg: -1 })).proteinTargetGrams).toBe(
      138
    );
  });
});

describe('getCalorieRange', () => {
  it('allows a little under and less over when losing', () => {
    expect(getCalorieRange(profile({ monthlyWeightGoalKg: 2 }), 2198)).toEqual({
      min: 1998,
      max: 2298,
    });
  });

  it('does not let the range go under the calorie floor', () => {
    const small = profile({
      gender: 'female',
      age: 25,
      heightCm: 155,
      weightKg: 50,
      activityLevel: 'sedentary',
      monthlyWeightGoalKg: 2,
    });

    expect(getCalorieRange(small, 1200)).toEqual({ min: 1200, max: 1300 });
  });
});

describe('getDailyCalorieGoalState', () => {
  const losing = profile({ monthlyWeightGoalKg: 2 });
  const gaining = profile({ monthlyWeightGoalKg: -1 });

  it('flags eating far under the target when losing', () => {
    expect(getDailyCalorieGoalState(losing, 2198, 300)).toBe('below_target');
    expect(getDailyCalorieGoalState(losing, 2198, 2100)).toBe('on_target');
    expect(getDailyCalorieGoalState(losing, 2198, 2400)).toBe('above_target');
  });

  it('judges a day by the goal it was planned under, not the current one', () => {
    // Logged while losing at 2198 kcal; the profile has since switched to gaining.
    expect(getDailyCalorieGoalState(gaining, 2198, 2050, '2099-01-01', 'lose')).toBe('on_target');
    expect(getDailyCalorieGoalState(gaining, 2198, 2050, '2099-01-01')).toBe('below_target');
  });

  it('flags eating far over the target when gaining', () => {
    expect(getDailyCalorieGoalState(gaining, 2968, 2800)).toBe('below_target');
    expect(getDailyCalorieGoalState(gaining, 2968, 3200)).toBe('on_target');
    expect(getDailyCalorieGoalState(gaining, 2968, 3300)).toBe('above_target');
  });

  it('keeps the old one-sided rule for days before the range rules started', () => {
    expect(getDailyCalorieGoalState(losing, 2198, 300, '2000-01-01')).toBe('on_target');
    expect(getDailyCalorieGoalState(gaining, 2968, 5000, '2000-01-01')).toBe('on_target');
  });
});

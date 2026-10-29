import { describe, expect, it } from '@jest/globals';
import type { BodyStats } from '@/features/profile/utils/calorie';
import {
  getDefaultWeeks,
  getGoalDurationBounds,
  getMaxWeeklyRateKg,
  getTargetWeightBounds,
  getWeeksForMonthlyRate,
  planForDuration,
} from './goalPlan';

function body(overrides: Partial<BodyStats> = {}): BodyStats {
  return {
    gender: 'female',
    age: 30,
    heightCm: 160,
    weightKg: 60,
    activityLevel: 'light',
    ...overrides,
  };
}

describe('getGoalDurationBounds', () => {
  it('limits weight loss by the 25% deficit cap', () => {
    // Maintenance 1772 kcal: at most 443 kcal a day, about 0.4 kg a week.
    const bounds = getGoalDurationBounds(body(), 55);

    expect(bounds.mode).toBe('lose');
    expect(bounds.changeKg).toBe(5);
    expect(bounds.maxWeeklyRateKg).toBeCloseTo(0.403, 3);
    expect(bounds.minWeeks).toBe(13);
    expect(bounds.maxWeeks).toBe(42);
  });

  it('limits weight loss by the calorie floor for small bodies', () => {
    // Maintenance 1457 kcal, floor 1214 (BMR): 243 kcal a day.
    const small = body({ weightKg: 50, age: 25, activityLevel: 'sedentary' });

    expect(getMaxWeeklyRateKg(small, 'lose')).toBeCloseTo((243 * 7) / 7700, 5);
  });

  it('limits weight gain to half a percent of body weight a week', () => {
    const bounds = getGoalDurationBounds(body(), 63);

    expect(bounds.mode).toBe('gain');
    expect(bounds.maxWeeklyRateKg).toBeCloseTo(0.3, 5);
    expect(bounds.minWeeks).toBe(10);
    // 3 kg at the slowest 0.25 kg a month.
    expect(bounds.maxWeeks).toBe(51);
  });

  it('never goes below four weeks', () => {
    const bounds = getGoalDurationBounds(body({ gender: 'male', weightKg: 90 }), 89);

    expect(bounds.minWeeks).toBe(4);
  });

  it('has no duration when maintaining', () => {
    expect(getGoalDurationBounds(body(), 60)).toMatchObject({
      mode: 'maintain',
      minWeeks: 0,
      maxWeeks: 0,
    });
  });
});

describe('getTargetWeightBounds', () => {
  it('only offers targets reachable within a year', () => {
    // 0.403 kg a week for 52 weeks: 20 kg.
    expect(getTargetWeightBounds(body(), 'lose')).toEqual({ min: 40, max: 59 });
    expect(getTargetWeightBounds(body(), 'gain')).toEqual({ min: 61, max: 75 });
  });

  it('keeps every offered target within the longest goal', () => {
    const { min } = getTargetWeightBounds(body(), 'lose');

    expect(getGoalDurationBounds(body(), min).minWeeks).toBeLessThanOrEqual(52);
  });
});

describe('planForDuration', () => {
  it('turns the chosen weeks into a daily deficit', () => {
    const plan = planForDuration(body(), 55, 20);

    expect(plan.weeklyRateKg).toBe(0.25);
    expect(plan.monthlyWeightGoalKg).toBe(1.07);
    expect(plan.maintenanceCalories).toBe(1772);
    expect(plan.dailyCalories).toBe(1497);
    expect(plan.pace).toBe('moderate');
  });

  it('stores a gain as a negative monthly goal', () => {
    const plan = planForDuration(body(), 63, 20);

    expect(plan.monthlyWeightGoalKg).toBe(-0.64);
    expect(plan.dailyCalories).toBe(1772 + 164);
  });

  it('clamps weeks outside the allowed range', () => {
    expect(planForDuration(body(), 55, 2).weeks).toBe(13);
    expect(planForDuration(body(), 55, 2).pace).toBe('fast');
    expect(planForDuration(body(), 55, 90).weeks).toBe(42);
  });

  it('eats at maintenance when maintaining', () => {
    expect(planForDuration(body(), 60, 10)).toMatchObject({
      monthlyWeightGoalKg: 0,
      dailyCalories: 1772,
    });
  });
});

describe('default and prefilled weeks', () => {
  it('defaults to a bit over half the fastest rate', () => {
    expect(getDefaultWeeks(getGoalDurationBounds(body(), 55))).toBe(21);
  });

  it('turns a saved monthly rate back into weeks', () => {
    expect(getWeeksForMonthlyRate(getGoalDurationBounds(body(), 55), 1)).toBe(21);
  });
});

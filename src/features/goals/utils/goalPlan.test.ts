import { describe, expect, it } from '@jest/globals';
import type { BodyStats } from '@/features/profile/utils/calorie';
import {
  draftFromPlan,
  getDefaultWeeks,
  getGoalDurationBounds,
  getMaxWeeklyRateKg,
  getTargetWeightBounds,
  getWeeksForMonthlyRate,
  normalizeGoalDraft,
  planForDuration,
  planFromDraft,
  suggestTargetWeight,
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

  it('offers the nearest whole kilogram past a decimal weight', () => {
    expect(getTargetWeightBounds(body({ weightKg: 70.3 }), 'lose').max).toBe(70);
    expect(getTargetWeightBounds(body({ weightKg: 70.3 }), 'gain').min).toBe(71);
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
    expect(plan.monthlyWeightGoalKg).toBe(1.0714);
    expect(plan.maintenanceCalories).toBe(1772);
    expect(plan.dailyCalories).toBe(1497);
    expect(plan.pace).toBe('moderate');
  });

  it('stores a gain as a negative monthly goal', () => {
    const plan = planForDuration(body(), 63, 20);

    expect(plan.monthlyWeightGoalKg).toBe(-0.6429);
    expect(plan.dailyCalories).toBe(1772 + 165);
  });

  it('keeps the monthly rate precise enough to land on the chosen day', () => {
    for (const weeks of [22, 25, 28, 42]) {
      const plan = planForDuration(body(), 55, weeks);

      expect(Math.round((5 / plan.monthlyWeightGoalKg) * 30)).toBe(weeks * 7);
    }
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

describe('goal drafts', () => {
  it('suggests a target about 5% lighter or 3 kg heavier', () => {
    expect(suggestTargetWeight(body(), 'lose')).toBe(57);
    expect(suggestTargetWeight(body(), 'gain')).toBe(63);
  });

  it('replaces a target on the wrong side after switching direction', () => {
    expect(normalizeGoalDraft(body(), { mode: 'gain', targetWeightKg: 55, weeks: 20 })).toEqual({
      mode: 'gain',
      targetWeightKg: 63,
      weeks: 20,
    });
  });

  it('fills in default weeks for a new target', () => {
    expect(normalizeGoalDraft(body(), { mode: 'lose', targetWeightKg: 55, weeks: 0 }).weeks).toBe(
      21
    );
  });

  it('round-trips a saved plan', () => {
    const draft = { mode: 'lose' as const, targetWeightKg: 55, weeks: 20 };
    const plan = planFromDraft(body(), draft);

    expect(plan).toEqual({ monthlyWeightGoalKg: 1.0714, targetWeightKg: 55 });
    expect(draftFromPlan(body(), plan.monthlyWeightGoalKg, plan.targetWeightKg)).toEqual(draft);
  });

  it('prefills a target for profiles saved without one', () => {
    expect(draftFromPlan(body(), 1, null).targetWeightKg).toBe(57);
  });

  it('saves no target when maintaining', () => {
    expect(planFromDraft(body(), { mode: 'maintain', targetWeightKg: 60, weeks: 0 })).toEqual({
      monthlyWeightGoalKg: 0,
      targetWeightKg: null,
    });
  });
});

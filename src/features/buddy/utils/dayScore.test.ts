import { describe, expect, it } from '@jest/globals';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import type { UserProfileInput } from '@/features/profile/types';
import type { DayMeals } from '../types';
import { getFiberTarget, scoreDay, type DayScoreInput } from './dayScore';

const PROFILE: UserProfileInput = {
  displayName: 'Test',
  gender: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  monthlyWeightGoalKg: 0,
  targetWeightKg: null,
  activityLevel: 'moderate',
};

const FULL_MEALS: DayMeals = { main: 3, onTime: 3, lateNight: false };

// A date after the legacy goal rules, so calorie ranges apply.
function summary(overrides: Partial<DailyNutritionSummary> = {}): DailyNutritionSummary {
  return {
    date: '2026-10-20',
    calorieTarget: 2000,
    goalMode: 'maintain',
    consumedCalories: 2000,
    remainingCalories: 0,
    progressPercent: 100,
    proteinGrams: 100,
    carbsGrams: 250,
    fatGrams: 60,
    proteinTargetGrams: 100,
    carbsTargetGrams: 250,
    fatTargetGrams: 60,
    nutrients: EMPTY_NUTRIENTS,
    ...overrides,
  };
}

function score(input: Partial<DayScoreInput> = {}, profile: UserProfileInput | null = PROFILE) {
  return scoreDay(
    { summary: summary(), meals: FULL_MEALS, nutrientCoverage: 1, ...input },
    profile
  );
}

describe('scoreDay', () => {
  it('only counts an empty day against consistency', () => {
    expect(score({ summary: summary({ consumedCalories: 0 }) })).toEqual({
      calories: null,
      nutrients: null,
      quality: null,
      timing: null,
      meals: null,
      consistency: 0,
    });
  });

  it('gives full calorie points on target and none half a target outside the range', () => {
    expect(score().calories).toBe(100);
    expect(score({ summary: summary({ consumedCalories: 4000 }) }).calories).toBe(0);
    expect(score({ summary: summary({ consumedCalories: 400 }) }).calories).toBe(0);
  });

  it('judges calories by the goal the day was planned under', () => {
    const under = { consumedCalories: 1500 };

    // Losing: eating under the target is on plan. Gaining: it is not.
    expect(score({ summary: summary({ ...under, goalMode: 'lose' }) }, null).calories).toBe(100);
    expect(score({ summary: summary({ ...under, goalMode: 'gain' }) }, null).calories).toBeLessThan(
      100
    );
  });

  it('averages how much of each macro target was reached, without credit for going over', () => {
    expect(score().nutrients).toBe(100);
    // Protein at half its target, carbs doubled, fat on target: (50 + 100 + 100) / 3.
    expect(score({ summary: summary({ proteinGrams: 50, carbsGrams: 500 }) }).nutrients).toBe(83);
  });

  it('scores nutrition quality from fiber and limits on days with enough data', () => {
    const nutrients = { ...EMPTY_NUTRIENTS, fiberGrams: 14, sodiumMg: 3000, sugarGrams: 40 };

    // Fiber half its 28 g target (50); sodium 50 % over (50) and sugar under (100) average 75.
    expect(score({ summary: summary({ nutrients }) }).quality).toBe(63);
    expect(getFiberTarget(2000)).toBe(28);
  });

  it('leaves nutrition quality unscored when too little food has the numbers', () => {
    const nutrients = { ...EMPTY_NUTRIENTS, fiberGrams: 30 };

    expect(score({ summary: summary({ nutrients }), nutrientCoverage: 0.5 }).quality).toBeNull();
    expect(score().quality).toBeNull();
  });

  it('scores main meals on time and takes points off for eating late', () => {
    expect(score().timing).toBe(100);
    expect(score({ meals: { main: 2, onTime: 1, lateNight: false } }).timing).toBe(50);
    expect(score({ meals: { main: 3, onTime: 3, lateNight: true } }).timing).toBe(70);
    expect(score({ meals: { main: 0, onTime: 0, lateNight: true } }).timing).toBe(0);
    expect(score({ meals: { main: 0, onTime: 0, lateNight: false } }).timing).toBeNull();
  });

  it('counts main meals out of three', () => {
    expect(score().meals).toBe(100);
    expect(score({ meals: { main: 2, onTime: 2, lateNight: false } }).meals).toBe(67);
  });

  it('gives a logged day full consistency', () => {
    expect(score().consistency).toBe(100);
  });
});

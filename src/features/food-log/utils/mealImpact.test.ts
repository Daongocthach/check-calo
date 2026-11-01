import { describe, expect, it } from '@jest/globals';
import type { DailyNutritionSummary, RecentFood } from '../types';
import { evaluateMealImpact, type MealImpactInput } from './mealImpact';
import { EMPTY_NUTRIENTS } from './nutrients';

function createDay(overrides: Partial<DailyNutritionSummary> = {}): DailyNutritionSummary {
  return {
    date: '2026-11-01',
    calorieTarget: 2000,
    goalMode: 'maintain',
    consumedCalories: 0,
    remainingCalories: 2000,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    proteinTargetGrams: 120,
    carbsTargetGrams: 220,
    fatTargetGrams: 65,
    nutrients: { ...EMPTY_NUTRIENTS },
    ...overrides,
  };
}

function createRecent(name: string, totalCalories: number, proteinGrams: number): RecentFood {
  return {
    ...EMPTY_NUTRIENTS,
    id: name,
    sourceEntryId: null,
    barcode: null,
    name,
    quantityLabel: '1 serving',
    quantityGrams: null,
    totalCalories,
    proteinGrams,
    carbsGrams: 0,
    fatGrams: 0,
    notes: null,
    imageUri: null,
    thumbnailUri: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function evaluate({
  calories,
  proteinGrams = 20,
  hour,
  slot,
  day = createDay(),
  recentFoods = [],
  nutrients = {},
}: {
  calories: number;
  proteinGrams?: number;
  hour: number;
  slot: MealImpactInput['slot'];
  day?: DailyNutritionSummary;
  recentFoods?: RecentFood[];
  nutrients?: Partial<MealImpactInput['meal']['nutrients']>;
}) {
  return evaluateMealImpact({
    meal: {
      name: 'Pho',
      calories,
      proteinGrams,
      nutrients: { ...EMPTY_NUTRIENTS, ...nutrients },
    },
    day,
    consumedAt: new Date(2026, 10, 1, hour),
    slot,
    recentFoods,
  });
}

describe('evaluateMealImpact', () => {
  it('splits what is left across the meals ahead', () => {
    const impact = evaluate({ calories: 400, hour: 7, slot: 'breakfast' });

    // 1600 kcal left, lunch takes 35 of the remaining 65 share points.
    expect(impact?.lines).toEqual([
      { kind: 'nextMeal', slot: 'lunch', calories: 862, remaining: 1600 },
    ]);
    expect(impact?.actions).toEqual([]);
  });

  it('flags going over the range and offers a smaller portion or a lighter food', () => {
    const lighter = createRecent('Grilled chicken rice', 300, 30);
    const impact = evaluate({
      calories: 600,
      hour: 19,
      slot: 'dinner',
      day: createDay({ consumedCalories: 1700, proteinGrams: 90 }),
      recentFoods: [
        lighter,
        createRecent('Black coffee', 100, 25),
        createRecent('Fried noodles', 350, 10),
      ],
    });

    expect(impact?.lines[0]).toEqual({ kind: 'over', calories: 300 });
    expect(impact?.actions).toEqual([
      { kind: 'portion', portion: 'twoThirds', calories: 400 },
      { kind: 'alternative', food: lighter },
    ]);
  });

  it('calls out a meal too big for its slot and falls back to asking the AI', () => {
    const impact = evaluate({ calories: 1000, proteinGrams: 40, hour: 7, slot: 'breakfast' });

    expect(impact?.lines).toContainEqual({ kind: 'heavy', percent: 50 });
    expect(impact?.actions).toEqual([
      { kind: 'portion', portion: 'twoThirds', calories: 667 },
      { kind: 'askAi', calories: 750 },
    ]);
  });

  it('warns when protein falls behind the meals already eaten', () => {
    const impact = evaluate({
      calories: 600,
      proteinGrams: 5,
      hour: 12,
      slot: 'lunch',
      day: createDay({ consumedCalories: 800, proteinGrams: 10 }),
    });

    expect(impact?.lines).toContainEqual({ kind: 'proteinLow', grams: 105 });
  });

  it('flags the limit nutrient closest to its daily reference, ignoring unknown values', () => {
    const impact = evaluate({
      calories: 500,
      hour: 12,
      slot: 'lunch',
      day: createDay({
        consumedCalories: 500,
        proteinGrams: 40,
        nutrients: { ...EMPTY_NUTRIENTS, sodiumMg: 1500, sugarGrams: 45 },
      }),
      nutrients: { sodiumMg: 600 },
    });

    expect(impact?.lines).toContainEqual({
      kind: 'nutrientHigh',
      nutrient: 'sodiumMg',
      percent: 91,
    });
    expect(
      impact?.lines.some((line) => line.kind === 'nutrientHigh' && line.nutrient === 'sugarGrams')
    ).toBe(false);
  });

  it('tells a gain goal it is still short late in the day', () => {
    const impact = evaluate({
      calories: 500,
      hour: 21,
      slot: 'dinner',
      day: createDay({ calorieTarget: 2800, goalMode: 'gain', consumedCalories: 1500 }),
    });

    expect(impact?.lines[0]).toEqual({ kind: 'short', calories: 800 });
  });

  it('says the day is full once the target is reached within the range', () => {
    const impact = evaluate({
      calories: 150,
      hour: 15,
      slot: 'snack',
      day: createDay({ consumedCalories: 1900, proteinGrams: 120 }),
    });

    expect(impact?.lines).toEqual([{ kind: 'full' }]);
  });

  it('skips days without a target', () => {
    expect(
      evaluate({ calories: 500, hour: 12, slot: 'lunch', day: createDay({ calorieTarget: 0 }) })
    ).toBeNull();
  });
});

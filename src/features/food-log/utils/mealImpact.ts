import { getCalorieRange } from '@/features/profile/utils/calorie';
import { NUTRIENTS } from '../constants';
import type { DailyNutritionSummary, NutrientKey, NutrientValues, RecentFood } from '../types';
import type { MealSlot } from './mealSlot';

type MainMealSlot = Exclude<MealSlot, 'snack'>;

/** Share of the daily target each meal is planned around. */
export const MEAL_SLOT_SHARES: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};
/** Local hour each main meal starts, matching `getMealSlot`. */
const MAIN_SLOT_START_HOURS: Record<MainMealSlot, number> = {
  breakfast: 4,
  lunch: 10,
  dinner: 17,
};
const MAIN_SLOTS: MainMealSlot[] = ['breakfast', 'lunch', 'dinner'];
const MAIN_SLOTS_SHARE = MAIN_SLOTS.reduce((total, slot) => total + MEAL_SLOT_SHARES[slot], 0);
/** A meal above this multiple of its slot's share is called heavy. */
const HEAVY_MEAL_RATIO = 1.5;
/** Protein counts as behind when this far under the share of the day already planned. */
const PROTEIN_LAG = 0.2;
/** A limit nutrient is flagged once the day reaches this share of its daily reference. */
const NUTRIENT_WARN_RATIO = 0.8;
/** An alternative must save at least this share of the meal's calories... */
const ALTERNATIVE_MIN_SAVING = 0.15;
/** ...but still be a real meal, not a drink next to a plate of rice. */
const ALTERNATIVE_MIN_SHARE = 0.3;

export const PORTION_FACTORS = { twoThirds: 2 / 3, half: 1 / 2 } as const;
export type MealPortion = keyof typeof PORTION_FACTORS;

export interface MealImpactMeal {
  name: string;
  calories: number;
  proteinGrams: number;
  nutrients: NutrientValues;
}

export interface MealImpactInput {
  meal: MealImpactMeal;
  /** The day the meal goes into, before it is logged. */
  day: DailyNutritionSummary;
  consumedAt: Date;
  slot: MealSlot;
  /** Foods the user has logged before; alternatives are picked from these. */
  recentFoods: RecentFood[];
}

export type MealImpactLine =
  | { kind: 'over'; calories: number }
  | { kind: 'nextMeal'; slot: MainMealSlot; calories: number; remaining: number }
  | { kind: 'remaining'; calories: number }
  | { kind: 'full' }
  | { kind: 'short'; calories: number }
  | { kind: 'heavy'; percent: number }
  | { kind: 'proteinLow'; grams: number }
  | { kind: 'nutrientHigh'; nutrient: NutrientKey; percent: number };

export type MealImpactAction =
  | { kind: 'portion'; portion: MealPortion; calories: number }
  | { kind: 'alternative'; food: RecentFood }
  | { kind: 'askAi'; calories: number };

export interface MealImpact {
  lines: MealImpactLine[];
  /** Ways to make the meal fit; empty when it already does. */
  actions: MealImpactAction[];
}

const MAX_LINES = 3;

/** Main meals still ahead after this one on the same day. */
function getMealsAhead(consumedAt: Date): MainMealSlot[] {
  const hour = consumedAt.getHours();
  return MAIN_SLOTS.filter((slot) => MAIN_SLOT_START_HOURS[slot] > hour);
}

function getCalorieLine(
  input: MealImpactInput,
  consumedAfter: number,
  maxCalories: number,
  minCalories: number,
  mealsAhead: MainMealSlot[]
): MealImpactLine {
  const { day } = input;

  if (consumedAfter > maxCalories) {
    return { kind: 'over', calories: Math.round(consumedAfter - day.calorieTarget) };
  }

  const remaining = Math.round(day.calorieTarget - consumedAfter);

  if (remaining <= 0) {
    return { kind: 'full' };
  }

  if (mealsAhead.length === 0) {
    // Late in the day, a gain goal still short of its range needs another meal.
    return day.goalMode === 'gain' && consumedAfter < minCalories
      ? { kind: 'short', calories: remaining }
      : { kind: 'remaining', calories: remaining };
  }

  const [nextSlot] = mealsAhead;
  const sharesAhead = mealsAhead.reduce((total, slot) => total + MEAL_SLOT_SHARES[slot], 0);

  return {
    kind: 'nextMeal',
    slot: nextSlot,
    calories: Math.round((remaining * MEAL_SLOT_SHARES[nextSlot]) / sharesAhead),
    remaining,
  };
}

function getProteinLine(input: MealImpactInput, mealsAhead: MainMealSlot[]): MealImpactLine | null {
  const { day, meal } = input;

  if (mealsAhead.length === 0 || day.proteinTargetGrams <= 0) {
    return null;
  }

  // The share of the day's main meals already behind us, this one included.
  const plannedShare =
    1 - mealsAhead.reduce((total, slot) => total + MEAL_SLOT_SHARES[slot], 0) / MAIN_SLOTS_SHARE;
  const proteinAfter = day.proteinGrams + meal.proteinGrams;

  if (proteinAfter / day.proteinTargetGrams > plannedShare - PROTEIN_LAG) {
    return null;
  }

  return { kind: 'proteinLow', grams: Math.round(day.proteinTargetGrams - proteinAfter) };
}

/** The limit nutrient this meal pushes closest to (or past) its daily reference. */
function getNutrientLine({ day, meal }: MealImpactInput): MealImpactLine | null {
  let worst: { nutrient: NutrientKey; ratio: number } | null = null;

  for (const definition of NUTRIENTS) {
    const mealValue = meal.nutrients[definition.key];

    if (definition.direction !== 'limit' || mealValue === null || mealValue <= 0) {
      continue;
    }

    const ratio = ((day.nutrients[definition.key] ?? 0) + mealValue) / definition.dailyValue;

    if (ratio >= NUTRIENT_WARN_RATIO && (!worst || ratio > worst.ratio)) {
      worst = { nutrient: definition.key, ratio };
    }
  }

  return worst
    ? { kind: 'nutrientHigh', nutrient: worst.nutrient, percent: Math.round(worst.ratio * 100) }
    : null;
}

function pickAlternative(input: MealImpactInput, budget: number) {
  const { meal, recentFoods } = input;
  const name = meal.name.trim().toLowerCase();
  const candidates = recentFoods.filter(
    (food) =>
      food.name.trim().toLowerCase() !== name &&
      food.totalCalories <= budget &&
      food.totalCalories <= meal.calories * (1 - ALTERNATIVE_MIN_SAVING) &&
      food.totalCalories >= meal.calories * ALTERNATIVE_MIN_SHARE &&
      food.proteinGrams >= meal.proteinGrams
  );

  // Most protein per calorie keeps people full on fewer calories.
  return candidates.reduce<RecentFood | null>(
    (best, food) =>
      !best || food.proteinGrams / food.totalCalories > best.proteinGrams / best.totalCalories
        ? food
        : best,
    null
  );
}

function getActions(
  input: MealImpactInput,
  isOver: boolean,
  isHeavy: boolean,
  maxCalories: number
): MealImpactAction[] {
  const { day, meal, slot } = input;

  if (!isOver && !isHeavy) {
    return [];
  }

  const slotBudget = day.calorieTarget * MEAL_SLOT_SHARES[slot] * HEAVY_MEAL_RATIO;
  const dayBudget = maxCalories - day.consumedCalories;
  const budget = Math.max(0, isOver ? Math.min(dayBudget, slotBudget) : slotBudget);
  const actions: MealImpactAction[] = [];
  const portion = (Object.keys(PORTION_FACTORS) as MealPortion[]).find(
    (key) => meal.calories * PORTION_FACTORS[key] <= budget
  );

  if (portion) {
    actions.push({
      kind: 'portion',
      portion,
      calories: Math.round(meal.calories * PORTION_FACTORS[portion]),
    });
  }

  const alternative = pickAlternative(input, budget);

  if (alternative) {
    actions.push({ kind: 'alternative', food: alternative });
  } else if (budget > 0) {
    actions.push({ kind: 'askAi', calories: Math.round(budget) });
  }

  return actions;
}

/**
 * What logging a meal does to the rest of the day: calories left for the next meal, a meal too
 * big for its slot, protein falling behind, a limit nutrient near its cap. When the meal does
 * not fit, also a smaller portion or a lighter food the user already eats.
 */
export function evaluateMealImpact(input: MealImpactInput): MealImpact | null {
  const { day, meal, slot, consumedAt } = input;

  if (day.calorieTarget <= 0 || meal.calories <= 0) {
    return null;
  }

  const range = getCalorieRange(null, day.calorieTarget, day.goalMode);
  const consumedAfter = day.consumedCalories + meal.calories;
  const mealsAhead = getMealsAhead(consumedAt);
  const isOver = consumedAfter > range.max;
  const isHeavy = meal.calories > day.calorieTarget * MEAL_SLOT_SHARES[slot] * HEAVY_MEAL_RATIO;
  const heavyLine: MealImpactLine | null = isHeavy
    ? { kind: 'heavy', percent: Math.round((meal.calories / day.calorieTarget) * 100) }
    : null;
  const lines = [
    getCalorieLine(input, consumedAfter, range.max, range.min, mealsAhead),
    heavyLine,
    getProteinLine(input, mealsAhead),
    getNutrientLine(input),
  ].filter((line): line is MealImpactLine => line !== null);

  return {
    lines: lines.slice(0, MAX_LINES),
    actions: getActions(input, isOver, isHeavy, range.max),
  };
}

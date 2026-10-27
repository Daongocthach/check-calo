import type { NutrientKey } from './types';

export type MacroKey = 'carbs' | 'protein' | 'fat';

export const MACRO_KEYS: MacroKey[] = ['carbs', 'protein', 'fat'];

export type NutrientColumn =
  | 'fiber_grams'
  | 'sugar_grams'
  | 'saturated_fat_grams'
  | 'trans_fat_grams'
  | 'cholesterol_mg'
  | 'sodium_mg'
  | 'potassium_mg';

export interface NutrientDefinition {
  key: NutrientKey;
  /** Column name in SQLite and Supabase (`food_entries`, `recent_foods`, `food_products`). */
  column: NutrientColumn;
  unit: 'g' | 'mg';
  /**
   * Daily reference for a 2,000 kcal diet. `goal` nutrients should reach it, `limit` ones stay
   * below it. Sources: FDA Daily Values; WHO guidelines for sugars and trans fat (no FDA DV).
   */
  dailyValue: number;
  direction: 'goal' | 'limit';
}

export const NUTRIENT_UNIT_KEYS = {
  g: 'common.units.gram',
  mg: 'common.units.milligram',
} as const;

export const NUTRIENTS: NutrientDefinition[] = [
  { key: 'fiberGrams', column: 'fiber_grams', unit: 'g', dailyValue: 28, direction: 'goal' },
  { key: 'sugarGrams', column: 'sugar_grams', unit: 'g', dailyValue: 50, direction: 'limit' },
  {
    key: 'saturatedFatGrams',
    column: 'saturated_fat_grams',
    unit: 'g',
    dailyValue: 20,
    direction: 'limit',
  },
  {
    key: 'transFatGrams',
    column: 'trans_fat_grams',
    unit: 'g',
    dailyValue: 2,
    direction: 'limit',
  },
  {
    key: 'cholesterolMg',
    column: 'cholesterol_mg',
    unit: 'mg',
    dailyValue: 300,
    direction: 'limit',
  },
  { key: 'sodiumMg', column: 'sodium_mg', unit: 'mg', dailyValue: 2300, direction: 'limit' },
  { key: 'potassiumMg', column: 'potassium_mg', unit: 'mg', dailyValue: 4700, direction: 'goal' },
];

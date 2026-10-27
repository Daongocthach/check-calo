import { describe, expect, it } from '@jest/globals';
import {
  EMPTY_NUTRIENTS,
  NUTRIENT_SQL,
  nutrientsFromColumns,
  pickNutrients,
  sumNutrients,
  toNutrientColumns,
  toNutrientParams,
} from './nutrients';

describe('pickNutrients', () => {
  it('rounds grams to one decimal and milligrams to whole numbers', () => {
    expect(pickNutrients({ fiberGrams: 2.46, sodiumMg: 812.6 })).toEqual({
      ...EMPTY_NUTRIENTS,
      fiberGrams: 2.5,
      sodiumMg: 813,
    });
  });

  it('treats missing, negative and non-numeric values as unknown', () => {
    expect(pickNutrients({ sugarGrams: -1, potassiumMg: Number.NaN, transFatGrams: '3' })).toEqual(
      EMPTY_NUTRIENTS
    );
  });

  it('keeps 0 apart from unknown', () => {
    expect(pickNutrients({ transFatGrams: 0 }).transFatGrams).toBe(0);
  });
});

describe('sumNutrients', () => {
  it('adds known values and keeps a nutrient unknown only when no item has it', () => {
    const totals = sumNutrients([
      { fiberGrams: 1.2, sodiumMg: 900 },
      { fiberGrams: 2.3, sodiumMg: null },
      {},
    ]);

    expect(totals.fiberGrams).toBe(3.5);
    expect(totals.sodiumMg).toBe(900);
    expect(totals.sugarGrams).toBeNull();
  });
});

describe('column mapping', () => {
  it('round-trips between columns and values', () => {
    const values = { ...EMPTY_NUTRIENTS, cholesterolMg: 120, saturatedFatGrams: 4.5 };

    expect(nutrientsFromColumns(toNutrientColumns(values))).toEqual(values);
  });

  it('reads rows without nutrient columns as unknown', () => {
    expect(nutrientsFromColumns({})).toEqual(EMPTY_NUTRIENTS);
  });

  it('keeps SQL fragments and params in the same order', () => {
    const columns = NUTRIENT_SQL.columns.split(', ');
    const params = toNutrientParams({ sodiumMg: 500 });

    expect(params).toHaveLength(columns.length);
    expect(params[columns.indexOf('sodium_mg')]).toBe(500);
  });
});

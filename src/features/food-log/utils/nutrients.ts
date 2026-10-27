import { NUTRIENTS, type NutrientColumn, type NutrientDefinition } from '../constants';
import type { NutrientValues } from '../types';

export type NutrientColumnValues = Record<NutrientColumn, number | null>;

export const EMPTY_NUTRIENTS: NutrientValues = {
  fiberGrams: null,
  sugarGrams: null,
  saturatedFatGrams: null,
  transFatGrams: null,
  cholesterolMg: null,
  sodiumMg: null,
  potassiumMg: null,
};

const NUTRIENT_COLUMNS = NUTRIENTS.map((nutrient) => nutrient.column);

/** SQL fragments in `NUTRIENTS` order; pair them with {@link toNutrientParams}. */
export const NUTRIENT_SQL = {
  columns: NUTRIENT_COLUMNS.join(', '),
  placeholders: NUTRIENT_COLUMNS.map(() => '?').join(', '),
  assignments: NUTRIENT_COLUMNS.map((column) => `${column} = ?`).join(', '),
  excluded: NUTRIENT_COLUMNS.map((column) => `${column} = excluded.${column}`).join(', '),
  sums: NUTRIENT_COLUMNS.map((column) => `SUM(${column}) AS ${column}`).join(', '),
};

function mapNutrients(read: (nutrient: NutrientDefinition) => number | null): NutrientValues {
  const values = { ...EMPTY_NUTRIENTS };

  for (const nutrient of NUTRIENTS) {
    values[nutrient.key] = read(nutrient);
  }

  return values;
}

/** Keeps finite, non-negative numbers: grams to one decimal, milligrams to whole numbers. */
export function toNutrientValue(value: unknown, unit: NutrientDefinition['unit']) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return unit === 'mg' ? Math.round(value) : Math.round(value * 10) / 10;
}

/** Normalizes loosely typed nutrient fields (AI output, partial inputs) into `NutrientValues`. */
export function pickNutrients(source: Partial<Record<keyof NutrientValues, unknown>>) {
  return mapNutrients((nutrient) => toNutrientValue(source[nutrient.key], nutrient.unit));
}

/** Reads nutrient columns from a SQLite or Supabase row; missing columns read as unknown. */
export function nutrientsFromColumns(row: Partial<NutrientColumnValues>) {
  return mapNutrients((nutrient) => row[nutrient.column] ?? null);
}

export function toNutrientColumns(source: Partial<NutrientValues>) {
  const columns: Partial<NutrientColumnValues> = {};

  for (const nutrient of NUTRIENTS) {
    columns[nutrient.column] = source[nutrient.key] ?? null;
  }

  return columns;
}

/** Copies nutrient columns between rows, e.g. a SQLite row into a Supabase payload. */
export function pickNutrientColumns(row: Partial<NutrientColumnValues>) {
  return toNutrientColumns(nutrientsFromColumns(row));
}

/** Bind values matching the `NUTRIENT_SQL` fragments. */
export function toNutrientParams(source: Partial<NutrientValues>) {
  return NUTRIENTS.map((nutrient) => source[nutrient.key] ?? null);
}

/** Adds up known values; a nutrient stays `null` only when every item left it unknown. */
export function sumNutrients(items: Array<Partial<NutrientValues>>) {
  return mapNutrients((nutrient) => {
    const known = items
      .map((item) => item[nutrient.key])
      .filter((value): value is number => typeof value === 'number');

    if (known.length === 0) {
      return null;
    }

    return toNutrientValue(
      known.reduce((total, value) => total + value, 0),
      nutrient.unit
    );
  });
}

export function hasAnyNutrient(values: Partial<NutrientValues>) {
  return NUTRIENTS.some((nutrient) => typeof values[nutrient.key] === 'number');
}

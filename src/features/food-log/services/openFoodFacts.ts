import { NUTRIENTS } from '../constants';
import type { NutrientKey, NutrientValues } from '../types';
import { pickNutrients } from '../utils/nutrients';
import { buildProductNotes, toRoundedString } from '../utils/productFormat';
import type { BarcodeFoodLookupResult } from './barcodeFoodLookup.types';

type Nutriments = Record<string, number | string | undefined>;

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    serving_size?: string;
    quantity?: string;
    nutriments?: Nutriments;
  };
}

const FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_url',
  'serving_size',
  'quantity',
  'nutriments',
] as const;

/** Open Food Facts nutriment name and the factor from its gram values to our unit. */
const NUTRIENT_NAMES: Record<NutrientKey, { name: string; factor: number }> = {
  fiberGrams: { name: 'fiber', factor: 1 },
  sugarGrams: { name: 'sugars', factor: 1 },
  saturatedFatGrams: { name: 'saturated-fat', factor: 1 },
  transFatGrams: { name: 'trans-fat', factor: 1 },
  cholesterolMg: { name: 'cholesterol', factor: 1000 },
  sodiumMg: { name: 'sodium', factor: 1000 },
  potassiumMg: { name: 'potassium', factor: 1000 },
};

function toCleanString(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseGrams(value: string) {
  const match = value.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml)\b/i);
  return match ? toRoundedString(Number(match[1])) : '';
}

function toNumber(value: number | string | undefined) {
  const parsedValue = typeof value === 'string' && value.trim().length > 0 ? Number(value) : value;
  return typeof parsedValue === 'number' && Number.isFinite(parsedValue) ? parsedValue : null;
}

/** A nutriment per serving, else per 100 g. */
function getNutriment(nutriments: Nutriments | undefined, name: string) {
  return nutriments
    ? (toNumber(nutriments[`${name}_serving`]) ?? toNumber(nutriments[`${name}_100g`]))
    : null;
}

function getNutrients(nutriments: Nutriments | undefined): NutrientValues {
  const values: Partial<Record<NutrientKey, number>> = {};

  for (const { key } of NUTRIENTS) {
    const { name, factor } = NUTRIENT_NAMES[key];
    const value = getNutriment(nutriments, name);

    if (value !== null) {
      values[key] = value * factor;
    }
  }

  return pickNutrients(values);
}

/** Looks a barcode up on Open Food Facts; null when the product is unknown there. */
export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<BarcodeFoodLookupResult | null> {
  const query = new URLSearchParams({ fields: FIELDS.join(',') });
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Barcode lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (payload.status !== 1 || !payload.product) {
    return null;
  }

  const { product } = payload;
  const brand = toCleanString(product.brands);
  const servingGrams = parseGrams(
    toCleanString(product.serving_size) || toCleanString(product.quantity)
  );
  const nutriment = (name: string) => toRoundedString(getNutriment(product.nutriments, name));

  return {
    barcode,
    foodName: toCleanString(product.product_name),
    brand,
    quantityLabel: servingGrams,
    quantityGrams: servingGrams,
    calories: nutriment('energy-kcal'),
    protein: nutriment('proteins'),
    carbs: nutriment('carbohydrates'),
    fat: nutriment('fat'),
    notes: buildProductNotes(barcode, brand),
    imageUri: toCleanString(product.image_front_url) || undefined,
    nutrients: getNutrients(product.nutriments),
    source: 'openfoodfacts',
  };
}

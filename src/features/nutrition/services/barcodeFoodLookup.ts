interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  serving_size?: string;
  quantity?: string;
  nutriments?: Record<string, number | string | undefined>;
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: OpenFoodFactsProduct;
}

export interface BarcodeFoodLookupResult {
  barcode: string;
  foodName: string;
  quantityLabel: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  imageUri?: string;
}

const OPEN_FOOD_FACTS_FIELDS = [
  'code',
  'product_name',
  'brands',
  'image_front_url',
  'serving_size',
  'quantity',
  'nutriments',
] as const;

function toCleanString(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function toRoundedString(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseGrams(value: string) {
  const normalizedValue = value.replace(',', '.');
  const match = normalizedValue.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml)\b/i);

  if (!match) {
    return '';
  }

  const parsedValue = Number(match[1]);
  return Number.isFinite(parsedValue) ? toRoundedString(parsedValue) : '';
}

function toNumber(value: number | string | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function getNutrimentValue(
  nutriments: Record<string, number | string | undefined> | undefined,
  servingKey: string,
  per100gKey: string
) {
  if (!nutriments) {
    return '';
  }

  const value = toNumber(nutriments[servingKey]) ?? toNumber(nutriments[per100gKey]);
  return toRoundedString(value);
}

function buildNotes(barcode: string, brands: string) {
  const noteParts = [brands, barcode].filter(Boolean);
  return noteParts.join(' • ');
}

export async function lookupFoodByBarcode(
  barcode: string
): Promise<BarcodeFoodLookupResult | null> {
  const trimmedBarcode = barcode.trim();

  if (!trimmedBarcode) {
    return null;
  }

  const query = new URLSearchParams({
    fields: OPEN_FOOD_FACTS_FIELDS.join(','),
  });

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(trimmedBarcode)}?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Barcode lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (payload.status !== 1 || !payload.product) {
    return null;
  }

  const { product } = payload;
  const brands = toCleanString(product.brands);

  return {
    barcode: trimmedBarcode,
    foodName: toCleanString(product.product_name),
    quantityLabel: parseGrams(
      toCleanString(product.serving_size) || toCleanString(product.quantity)
    ),
    calories: getNutrimentValue(product.nutriments, 'energy-kcal_serving', 'energy-kcal_100g'),
    protein: getNutrimentValue(product.nutriments, 'proteins_serving', 'proteins_100g'),
    carbs: getNutrimentValue(product.nutriments, 'carbohydrates_serving', 'carbohydrates_100g'),
    fat: getNutrimentValue(product.nutriments, 'fat_serving', 'fat_100g'),
    notes: buildNotes(trimmedBarcode, brands),
    imageUri: toCleanString(product.image_front_url) || undefined,
  };
}

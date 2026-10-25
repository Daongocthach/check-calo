export function formatMealWeight(
  quantityGrams: number | null | undefined,
  fallbackLabel: string | null | undefined,
  gramUnit: string
) {
  if (typeof quantityGrams === 'number' && !Number.isNaN(quantityGrams) && quantityGrams > 0) {
    return `${Math.round(quantityGrams)} ${gramUnit}`;
  }

  const normalizedLabel = fallbackLabel?.trim();

  if (!normalizedLabel) {
    return `0 ${gramUnit}`;
  }

  const lowerLabel = normalizedLabel.toLowerCase();
  const lowerGramUnit = gramUnit.toLowerCase();

  if (lowerLabel.includes(lowerGramUnit) || lowerLabel.endsWith('g')) {
    return normalizedLabel;
  }

  return `${normalizedLabel} ${gramUnit}`;
}

export function parseMealWeightInput(value: string) {
  const normalizedValue = value.replace(',', '.').trim();
  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

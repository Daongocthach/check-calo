export function formatTime(value: string | Date, language: string) {
  return new Date(value).toLocaleTimeString(toLocale(language), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function roundNumber(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function toLocale(language: string) {
  return language === 'en' ? 'en-US' : 'vi-VN';
}

const nutrientFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Grams keep one decimal (2,5 g fiber in Vietnamese, 2.5 g in English), milligrams are whole
 * numbers. Form inputs pass `grouping: false` so "2300" is not read back as 2.3 ("2.300").
 */
export function formatNutrientAmount(
  value: number,
  unit: 'g' | 'mg',
  language: string,
  { grouping = true }: { grouping?: boolean } = {}
) {
  const locale = toLocale(language);
  const cacheKey = `${locale}|${unit}|${grouping}`;
  let formatter = nutrientFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: unit === 'mg' ? 0 : 1,
      useGrouping: grouping,
    });
    nutrientFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(value);
}

export function formatTime(value: string | Date, language: string) {
  return new Date(value).toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function roundNumber(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

/** Grams keep one decimal (2.5 g fiber), milligrams are whole numbers. */
export function formatNutrientAmount(value: number, unit: 'g' | 'mg') {
  if (unit === 'mg' || Number.isInteger(value)) {
    return String(Math.round(value));
  }

  return value.toFixed(1);
}

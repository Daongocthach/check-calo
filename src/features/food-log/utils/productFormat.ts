/** A number as form text: whole numbers as-is, others to one decimal, '' when missing. */
export function toRoundedString(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildProductNotes(barcode: string, brand: string) {
  return [brand, barcode].filter(Boolean).join(' • ');
}

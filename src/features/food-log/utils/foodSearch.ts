/** Lowercases and drops Vietnamese accents, so "pho bo" finds "Phở bò". */
export function normalizeFoodText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(value: string) {
  const normalized = normalizeFoodText(value);
  return normalized ? normalized.split(' ') : [];
}

/** True when every typed word starts a word of the name, in any order: "bo pho" finds "Phở bò". */
export function matchesFoodSearch(name: string, query: string): boolean {
  const queryWords = words(query);
  const nameWords = words(name);

  return (
    queryWords.length > 0 &&
    queryWords.every((queryWord) => nameWords.some((nameWord) => nameWord.startsWith(queryWord)))
  );
}

/** True when a sentence names the food in full, e.g. "sáng nay ăn phở bò" and "Phở bò". */
export function mentionsFood(text: string, name: string): boolean {
  const normalizedName = normalizeFoodText(name);
  return (
    normalizedName.length > 0 && ` ${normalizeFoodText(text)} `.includes(` ${normalizedName} `)
  );
}

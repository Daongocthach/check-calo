import { describe, expect, it } from '@jest/globals';
import { formatNutrientAmount } from './format';

describe('formatNutrientAmount', () => {
  it('uses comma decimals in Vietnamese and dots in English', () => {
    expect(formatNutrientAmount(12.5, 'g', 'vi')).toBe('12,5');
    expect(formatNutrientAmount(12.5, 'g', 'en')).toBe('12.5');
  });

  it('drops a trailing zero and rounds milligrams to whole numbers', () => {
    expect(formatNutrientAmount(2.04, 'g', 'vi')).toBe('2');
    expect(formatNutrientAmount(812.6, 'mg', 'en')).toBe('813');
  });

  it('groups thousands for display and not for form inputs', () => {
    expect(formatNutrientAmount(2300, 'mg', 'vi')).toBe('2.300');
    expect(formatNutrientAmount(2300, 'mg', 'en')).toBe('2,300');
    expect(formatNutrientAmount(2300, 'mg', 'vi', { grouping: false })).toBe('2300');
  });
});

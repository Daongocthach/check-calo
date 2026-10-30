import { describe, expect, it } from '@jest/globals';
import { matchesFoodSearch, mentionsFood, normalizeFoodText } from './foodSearch';

describe('normalizeFoodText', () => {
  it('drops accents, đ and punctuation', () => {
    expect(normalizeFoodText('  Phở Bò (tái), ĐẬU hũ! ')).toBe('pho bo tai dau hu');
  });
});

describe('matchesFoodSearch', () => {
  it('finds a food typed without accents', () => {
    expect(matchesFoodSearch('Phở bò tái', 'pho bo')).toBe(true);
  });

  it('matches word starts in any order', () => {
    expect(matchesFoodSearch('Phở bò tái', 'bo ph')).toBe(true);
  });

  it('needs every typed word', () => {
    expect(matchesFoodSearch('Phở bò', 'pho ga')).toBe(false);
  });

  it('does not match inside a word', () => {
    expect(matchesFoodSearch('Bánh mì', 'anh')).toBe(false);
  });

  it('matches nothing for blank text', () => {
    expect(matchesFoodSearch('Phở bò', '  ')).toBe(false);
  });
});

describe('mentionsFood', () => {
  it('finds a food named inside a sentence', () => {
    expect(mentionsFood('Sáng nay ăn 1 tô phở bò', 'Phở bò')).toBe(true);
  });

  it('needs whole words', () => {
    expect(mentionsFood('ăn phở bòn bon', 'Phở bò')).toBe(false);
  });
});

import { describe, expect, it } from '@jest/globals';
import { toAppLanguage } from './languages';

describe('toAppLanguage', () => {
  it('keeps supported languages and falls back to Vietnamese', () => {
    expect(toAppLanguage('zh-Hant')).toBe('zh-Hant');
    expect(toAppLanguage('de')).toBe('vi');
    expect(toAppLanguage(undefined)).toBe('vi');
  });
});

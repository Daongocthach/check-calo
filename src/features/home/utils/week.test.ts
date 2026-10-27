import { describe, expect, it } from '@jest/globals';
import { getWeekDays, getWeekStart, getWeekStarts } from './week';

describe('week utils', () => {
  it('starts weeks on Monday', () => {
    expect(getWeekStart(new Date(2026, 9, 27, 15, 30))).toEqual(new Date(2026, 9, 26));
    expect(getWeekStart(new Date(2026, 10, 1))).toEqual(new Date(2026, 9, 26));
  });

  it('returns the seven days of the week', () => {
    const days = getWeekDays(new Date(2026, 9, 29));

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual(new Date(2026, 9, 26));
    expect(days[6]).toEqual(new Date(2026, 10, 1));
  });

  it('lists every Monday between two dates, oldest first', () => {
    expect(getWeekStarts(new Date(2026, 9, 14), new Date(2026, 9, 27))).toEqual([
      new Date(2026, 9, 12),
      new Date(2026, 9, 19),
      new Date(2026, 9, 26),
    ]);
  });
});

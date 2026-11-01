import { describe, expect, it } from '@jest/globals';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import type { AxisScores, BuddyDayScore } from '../types';
import { aggregateBuddyStats, averageScores } from './statsAggregate';

const EMPTY: AxisScores = {
  calories: null,
  nutrients: null,
  quality: null,
  timing: null,
  meals: null,
  consistency: 0,
};

function day(date: string, scores: Partial<AxisScores>, isToday = false): BuddyDayScore {
  const logged = scores.calories !== undefined;

  return {
    date,
    isToday,
    logged,
    summary: {} as DailyNutritionSummary,
    meals: { main: 0, onTime: 0, lateNight: false },
    nutrientCoverage: 0,
    scores: { ...EMPTY, ...scores },
  };
}

describe('averageScores', () => {
  it('waits for three days of data before showing a stat', () => {
    const days = [day('1', { calories: 90 }), day('2', { calories: 60 })];

    expect(averageScores(days).calories).toBeNull();
    expect(averageScores([...days, day('3', { calories: 30 })]).calories).toBe(60);
  });

  it('skips days without data for a stat', () => {
    const days = [
      day('1', { calories: 90, quality: 40 }),
      day('2', { calories: 90 }),
      day('3', { calories: 90, quality: 60 }),
      day('4', { calories: 90, quality: 80 }),
    ];

    expect(averageScores(days).quality).toBe(60);
  });
});

describe('aggregateBuddyStats', () => {
  it('leaves today out until it is over', () => {
    const days = [
      day('1', { calories: 50 }),
      day('2', { calories: 50 }),
      day('3', { calories: 50 }),
      day('4', { calories: 100 }, true),
    ];

    const stats = aggregateBuddyStats(days);

    expect(stats.overall.calories).toBe(50);
    expect(stats.loggedDays).toBe(3);
  });

  it('averages the recent stats over the last seven finished days', () => {
    const old = Array.from({ length: 10 }, (_, index) => day(`old-${index}`, { calories: 0 }));
    const recent = Array.from({ length: 7 }, (_, index) => day(`new-${index}`, { calories: 70 }));

    const stats = aggregateBuddyStats([...old, ...recent]);

    expect(stats.recent.calories).toBe(70);
    expect(stats.overall.calories).toBe(29);
  });

  it('counts empty days against consistency only', () => {
    const days = [
      day('1', { calories: 80, consistency: 100 }),
      day('2', {}),
      day('3', { calories: 80, consistency: 100 }),
      day('4', { calories: 80, consistency: 100 }),
    ];

    const stats = aggregateBuddyStats(days);

    expect(stats.overall.consistency).toBe(75);
    expect(stats.overall.calories).toBe(80);
  });
});

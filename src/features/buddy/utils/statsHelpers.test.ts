import { describe, expect, it } from '@jest/globals';
import type { AxisScores } from '../types';
import { getBuddyInsight } from './buddyInsight';
import { getAxisPoint } from './hexagonGeometry';
import { getOnTimeWindows, summarizeDayMeals, summarizeMealsByDate } from './mealTiming';

function at(hour: number, minute = 30) {
  return new Date(2026, 9, 20, hour, minute).toISOString();
}

describe('summarizeDayMeals', () => {
  const usual = getOnTimeWindows([]);

  it('counts each main meal once, judged by its first entry', () => {
    const meals = summarizeDayMeals([at(7), at(8), at(15), at(19)], usual);

    // 15:30 is an afternoon snack, not a main meal.
    expect(meals).toEqual({ main: 2, onTime: 2, lateNight: false });
  });

  it('judges meals by usual times without reminders', () => {
    // 10:00 is breakfast but after 09:30; 14:00 is lunch but after 13:30.
    expect(summarizeDayMeals([at(10, 0), at(14, 0), at(19)], usual)).toEqual({
      main: 3,
      onTime: 1,
      lateNight: false,
    });
  });

  it('judges meals within an hour of the meal reminder the user set', () => {
    const windows = getOnTimeWindows([
      { kind: 'breakfast', time: '09:30', enabled: true },
      { kind: 'lunch', time: '12:00', enabled: false },
    ]);

    // 10:00 is within an hour of the 09:30 reminder; the disabled lunch reminder is ignored,
    // so 14:00 is judged by the usual 11:00-13:30.
    expect(summarizeDayMeals([at(10, 0)], windows).onTime).toBe(1);
    expect(summarizeDayMeals([at(14, 0)], windows).onTime).toBe(0);
  });

  it('flags eating late at night', () => {
    expect(summarizeDayMeals([at(23)], usual)).toEqual({ main: 0, onTime: 0, lateNight: true });
    expect(summarizeDayMeals([at(1)], usual).lateNight).toBe(true);
  });

  it('groups entries by day', () => {
    const byDate = summarizeMealsByDate(
      [
        { date: '2026-10-20', consumedAt: at(7) },
        { date: '2026-10-20', consumedAt: at(12) },
        { date: '2026-10-21', consumedAt: at(19) },
      ],
      usual
    );

    expect(byDate.get('2026-10-20')?.main).toBe(2);
    expect(byDate.get('2026-10-21')?.main).toBe(1);
  });
});

describe('getAxisPoint', () => {
  const center = { x: 100, y: 100 };
  const radii = { inner: 20, outer: 60 };

  it('puts 0 on the inner ring and 100 on the outer one', () => {
    expect(getAxisPoint(center, radii, 'calories', 0)).toEqual({ x: 100, y: 80 });
    expect(getAxisPoint(center, radii, 'calories', 100)).toEqual({ x: 100, y: 40 });
  });

  it('runs the fourth axis straight down', () => {
    const bottom = getAxisPoint(center, radii, 'timing', 50);

    expect(bottom.x).toBeCloseTo(100);
    expect(bottom.y).toBeCloseTo(140);
  });
});

describe('getBuddyInsight', () => {
  const scores: AxisScores = {
    calories: 92,
    nutrients: 70,
    quality: null,
    timing: 40,
    meals: 85,
    consistency: 100,
  };

  it('names the best stat and the one that needs work', () => {
    expect(getBuddyInsight(scores)).toEqual({ strongest: 'consistency', weakest: 'timing' });
  });

  it('has nothing to fix when every stat is doing well', () => {
    expect(getBuddyInsight({ ...scores, nutrients: 90, timing: 80 })?.weakest).toBeNull();
  });

  it('says nothing without data', () => {
    expect(
      getBuddyInsight({
        ...scores,
        calories: null,
        nutrients: null,
        timing: null,
        meals: null,
        consistency: null,
      })
    ).toBeNull();
  });
});

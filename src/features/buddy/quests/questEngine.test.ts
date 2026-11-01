import { describe, expect, it } from '@jest/globals';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import { DEFAULT_QUESTS } from '../constants/quests';
import type { BuddyDayScore, BuddyQuest } from '../types';
import { getIsoWeekKey, getWeekDates } from './isoWeek';
import { evaluateQuests, type QuestEngineInput } from './questEngine';

// Sunday 1 November 2026; its ISO week runs Monday 26 October to Sunday 1 November.
const TODAY = '2026-11-01';

function quest(id: string): BuddyQuest {
  const found = DEFAULT_QUESTS.find((item) => item.id === id);
  if (!found) throw new Error(`No quest ${id}`);
  return found;
}

function day(date: string, overrides: Partial<DailyNutritionSummary> = {}): BuddyDayScore {
  const summary: DailyNutritionSummary = {
    date,
    calorieTarget: 2000,
    goalMode: 'maintain',
    consumedCalories: 2000,
    remainingCalories: 0,
    progressPercent: 100,
    proteinGrams: 100,
    carbsGrams: 250,
    fatGrams: 60,
    proteinTargetGrams: 100,
    carbsTargetGrams: 250,
    fatTargetGrams: 60,
    nutrients: { ...EMPTY_NUTRIENTS, fiberGrams: 30, sodiumMg: 1500, sugarGrams: 30 },
    ...overrides,
  };
  const logged = summary.consumedCalories > 0;

  return {
    date,
    isToday: date === TODAY,
    logged,
    summary,
    meals: { main: logged ? 3 : 0, onTime: logged ? 3 : 0, lateNight: false },
    nutrientCoverage: logged ? 1 : 0,
    scores: {
      calories: logged ? 100 : null,
      nutrients: null,
      quality: null,
      timing: null,
      meals: null,
      consistency: logged ? 100 : 0,
    },
  };
}

function input(overrides: Partial<QuestEngineInput>): QuestEngineInput {
  return {
    quests: DEFAULT_QUESTS,
    days: getWeekDates(TODAY).map((date) => day(date)),
    today: TODAY,
    now: new Date(`${TODAY}T12:00:00`),
    goalMode: 'maintain',
    level: 1,
    completions: [],
    completedGoals: [],
    hasAccount: false,
    switchedAt: null,
    ...overrides,
  };
}

function completedIds(result: ReturnType<typeof evaluateQuests>) {
  return result.newCompletions.map((item) => `${item.questId}|${item.periodKey}`);
}

describe('ISO weeks', () => {
  it('names weeks like Postgres IYYY-"W"IW', () => {
    expect(getIsoWeekKey('2026-11-01')).toBe('2026-W44');
    expect(getIsoWeekKey('2026-10-26')).toBe('2026-W44');
    expect(getIsoWeekKey('2026-11-02')).toBe('2026-W45');
    // 1 January 2027 is a Friday, still in the last week of 2026.
    expect(getIsoWeekKey('2027-01-01')).toBe('2026-W53');
  });

  it('lists Monday to Sunday', () => {
    expect(getWeekDates(TODAY)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });
});

describe('evaluateQuests: daily', () => {
  it('records what is met today and leaves the calorie goal and limits for the end of the day', () => {
    const result = evaluateQuests(input({}));
    const ids = completedIds(result);

    expect(ids).toEqual(
      expect.arrayContaining([
        `day_first_log|${TODAY}`,
        `day_diverse|${TODAY}`,
        `day_fiber|${TODAY}`,
        'day_calorie_goal|2026-10-31',
        'day_limits|2026-10-31',
      ])
    );
    expect(ids).not.toContain(`day_calorie_goal|${TODAY}`);
    expect(ids).not.toContain(`day_limits|${TODAY}`);
    expect(result.statuses.find((s) => s.quest.id === 'day_calorie_goal')?.state).toBe('settling');
  });

  it('only counts the first log on the day itself', () => {
    const days = [day('2026-10-31'), day(TODAY, { consumedCalories: 0 })];

    expect(completedIds(evaluateQuests(input({ days })))).not.toContain('day_first_log|2026-10-31');
  });

  it('does not judge the limits without enough nutrient data', () => {
    const sparse = { ...day('2026-10-31'), nutrientCoverage: 0.4 };

    expect(completedIds(evaluateQuests(input({ days: [sparse, day(TODAY)] })))).not.toContain(
      'day_limits|2026-10-31'
    );
  });

  it('needs every macro to bring a tenth of the calories', () => {
    const noFat = day(TODAY, { fatGrams: 10 });

    expect(completedIds(evaluateQuests(input({ days: [noFat] })))).not.toContain(
      `day_diverse|${TODAY}`
    );
  });

  it('skips periods already recorded and days before the switch to quests', () => {
    const result = evaluateQuests(
      input({
        completions: [{ questId: 'day_fiber', periodKey: TODAY, points: 15, completedAt: TODAY }],
        switchedAt: `${TODAY}T08:00:00.000Z`,
      })
    );
    const ids = completedIds(result);

    expect(ids).not.toContain(`day_fiber|${TODAY}`);
    expect(ids).not.toContain('day_calorie_goal|2026-10-31');
  });
});

describe('evaluateQuests: weekly', () => {
  it('completes a week once enough finished days met the metric', () => {
    const ids = completedIds(evaluateQuests(input({})));

    // Six finished days on target is enough for 5 of 7; logging all 7 includes today.
    expect(ids).toContain('week_calorie_goal|2026-W44');
    expect(ids).toContain('week_log|2026-W44');
    // Limits need all 7, and today has not ended yet.
    expect(ids).not.toContain('week_limits|2026-W44');
  });

  it('counts a day without food as missed', () => {
    const days = getWeekDates(TODAY).map((date) =>
      date === '2026-10-28' ? day(date, { consumedCalories: 0 }) : day(date)
    );
    const status = evaluateQuests(input({ days })).statuses.find((s) => s.quest.id === 'week_log');

    expect(status?.state).toBe('open');
    expect(status?.week?.[2]).toBe('missed');
    expect(status?.progress).toEqual({ value: 6, target: 7, unit: 'days' });
  });
});

describe('evaluateQuests: special', () => {
  it('records each level reached once', () => {
    const ids = completedIds(evaluateQuests(input({ level: 3 })));

    expect(ids).toEqual(
      expect.arrayContaining(['special_level_up|level-2', 'special_level_up|level-3'])
    );
  });

  it('rewards weight goals reached after the switch and a real account', () => {
    const ids = completedIds(
      evaluateQuests(
        input({
          hasAccount: true,
          switchedAt: '2026-10-30T00:00:00.000Z',
          completedGoals: [
            { id: 'goal-old', completedAt: '2026-09-01T00:00:00.000Z' },
            { id: 'goal-new', completedAt: '2026-10-31T09:00:00.000Z' },
          ],
        })
      )
    );

    expect(ids).toContain('special_weight_goal|goal-new');
    expect(ids).not.toContain('special_weight_goal|goal-old');
    expect(ids).toContain('special_account|once');
  });

  it('hides quests meant for another goal or outside their dates', () => {
    const forGain = { ...quest('day_fiber'), id: 'gain_only', goalModes: ['gain' as const] };
    const ended = { ...quest('day_fiber'), id: 'ended', endsAt: '2026-10-01T00:00:00.000Z' };
    const ids = evaluateQuests(input({ quests: [forGain, ended] })).statuses.map(
      (status) => status.quest.id
    );

    expect(ids).toEqual([]);
  });
});

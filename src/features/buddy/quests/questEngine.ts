import type { WeightGoalMode } from '@/features/goals/types';
import { addDays } from '@/features/goals/utils/weightGoal';
import { formatDateKey } from '@/utils/date';
import { DIVERSE_MIN_SHARE } from '../constants/quests';
import { NUTRIENT_COVERAGE_MIN, NUTRIENT_LIMITS } from '../constants/stats';
import type { BuddyDayScore, BuddyQuest, QuestCompletion, QuestKind } from '../types';
import { getFiberTarget, getSaturatedFatLimit } from '../utils/dayScore';
import { getIsoWeekKey, getWeekDates } from './isoWeek';

/** Within limits needs at least this many main meals, or an empty day would pass. */
const LIMITS_MIN_MAIN_MEALS = 2;
const MAX_LEVEL = 10;

export type QuestUnit = 'kcal' | 'g' | 'macros' | 'days';

/** How a quest stands for its current period. */
export interface QuestStatus {
  quest: BuddyQuest;
  periodKey: string;
  /** done: recorded; settling: met so far, confirmed when the day ends; open: not met yet. */
  state: 'done' | 'settling' | 'open';
  progress: { value: number; target: number; unit: QuestUnit } | null;
  /** Weekly quests, Monday to Sunday. */
  week: ('met' | 'missed' | 'today' | 'future')[] | null;
  /** Within limits cannot be judged today: not enough nutrient data or main meals yet. */
  needsData: boolean;
  /** Special quests: how many times it was completed (level-ups, weight goals). */
  timesDone: number;
}

export interface QuestEngineInput {
  quests: BuddyQuest[];
  /** Every day since the first log through today, scored (see getBuddyStats). */
  days: BuddyDayScore[];
  today: string;
  now: Date;
  /** The goal today is planned under, for quests limited to some goals. */
  goalMode: WeightGoalMode;
  level: number;
  completions: QuestCompletion[];
  /** Weight goals completed, with when. */
  completedGoals: { id: string; completedAt: string }[];
  /** Signed in with a real (not anonymous) account. */
  hasAccount: boolean;
  /** When quests replaced the old rules; earlier days and goals earn nothing more. */
  switchedAt: string | null;
}

interface DayCheck {
  met: boolean;
  /** The result can no longer change: the day is over, or the metric only goes up. */
  final: boolean;
}

/** Each of protein, carbs and fat gives at least a tenth of the day's calories. */
export function countDiverseMacros(day: BuddyDayScore) {
  const { consumedCalories, proteinGrams, carbsGrams, fatGrams } = day.summary;

  if (consumedCalories <= 0) {
    return 0;
  }

  return [proteinGrams * 4, carbsGrams * 4, fatGrams * 9].filter(
    (calories) => calories / consumedCalories >= DIVERSE_MIN_SHARE
  ).length;
}

/** Whether a day has enough data to judge the limits, and whether it stayed under them. */
export function checkLimits(day: BuddyDayScore) {
  const { nutrients, calorieTarget } = day.summary;
  const judged =
    day.nutrientCoverage >= NUTRIENT_COVERAGE_MIN && day.meals.main >= LIMITS_MIN_MAIN_MEALS;
  const checks: [number | null, number | null][] = [
    [nutrients.sugarGrams, NUTRIENT_LIMITS.sugarGrams],
    [nutrients.sodiumMg, NUTRIENT_LIMITS.sodiumMg],
    [nutrients.transFatGrams, NUTRIENT_LIMITS.transFatGrams],
    [nutrients.cholesterolMg, NUTRIENT_LIMITS.cholesterolMg],
    [nutrients.saturatedFatGrams, getSaturatedFatLimit(calorieTarget)],
  ];
  const known = checks.filter(
    (check): check is [number, number] => check[0] !== null && check[1] !== null
  );

  return {
    judged: judged && known.length > 0,
    within: known.every(([value, limit]) => value <= limit),
  };
}

function checkDay(metric: BuddyQuest['metric'], day: BuddyDayScore | undefined): DayCheck {
  if (!day || !day.logged) {
    return { met: false, final: !day?.isToday };
  }

  const ended = !day.isToday;

  switch (metric) {
    case 'first_log':
      return { met: true, final: true };
    case 'diverse_menu':
      return { met: countDiverseMacros(day) === 3, final: ended || countDiverseMacros(day) === 3 };
    case 'fiber_enough': {
      const fiber = day.summary.nutrients.fiberGrams ?? 0;
      const met = fiber >= getFiberTarget(day.summary.calorieTarget);
      return { met, final: ended || met };
    }
    case 'calorie_goal':
      return { met: day.scores.calories === 100, final: ended };
    case 'within_limits': {
      const limits = checkLimits(day);
      return { met: limits.judged && limits.within, final: ended };
    }
    default:
      return { met: false, final: true };
  }
}

function isAvailable(quest: BuddyQuest, goalMode: WeightGoalMode, now: Date) {
  const time = now.getTime();

  return (
    (!quest.goalModes || quest.goalModes.includes(goalMode)) &&
    (!quest.startsAt || Date.parse(quest.startsAt) <= time) &&
    (!quest.endsAt || Date.parse(quest.endsAt) > time)
  );
}

function dayProgress(quest: BuddyQuest, day: BuddyDayScore | undefined): QuestStatus['progress'] {
  if (!day) {
    return null;
  }

  switch (quest.metric) {
    case 'calorie_goal':
      return {
        value: Math.round(day.summary.consumedCalories),
        target: Math.round(day.summary.calorieTarget),
        unit: 'kcal',
      };
    case 'diverse_menu':
      return { value: countDiverseMacros(day), target: 3, unit: 'macros' };
    case 'fiber_enough':
      return {
        value: Math.round(day.summary.nutrients.fiberGrams ?? 0),
        target: getFiberTarget(day.summary.calorieTarget),
        unit: 'g',
      };
    default:
      return null;
  }
}

/**
 * Where every available quest stands, and which completions to record now: met days, met
 * weeks, levels reached, goals reached and an account. Only finished days settle the
 * calorie goal and the limits; yesterday and last week still settle when the app opens.
 */
export function evaluateQuests(input: QuestEngineInput) {
  const { quests, days, today, now, goalMode, completions } = input;
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const done = new Set(completions.map((item) => `${item.questId}|${item.periodKey}`));
  const isDone = (quest: BuddyQuest, periodKey: string) => done.has(`${quest.id}|${periodKey}`);
  const switchDate = input.switchedAt ? formatDateKey(input.switchedAt) : null;
  const earns = (dateKey: string) => !switchDate || dateKey >= switchDate;
  const newCompletions: Omit<QuestCompletion, 'completedAt'>[] = [];
  const statuses: QuestStatus[] = [];
  const complete = (quest: BuddyQuest, periodKey: string) => {
    if (!isDone(quest, periodKey)) {
      newCompletions.push({ questId: quest.id, periodKey, points: quest.points });
      done.add(`${quest.id}|${periodKey}`);
    }
  };

  const countWeek = (quest: BuddyQuest, weekDay: string) => {
    const checks = getWeekDates(weekDay).map((date) => ({
      date,
      check: checkDay(quest.metric, dayByDate.get(date)),
    }));
    return { checks, met: checks.filter(({ check }) => check.met && check.final).length };
  };

  for (const quest of quests.filter((item) => isAvailable(item, goalMode, now))) {
    if (quest.kind === 'daily') {
      // First log only counts on the day; the others settle yesterday too.
      const dates = quest.metric === 'first_log' ? [today] : [addDays(today, -1), today];

      for (const date of dates) {
        const check = checkDay(quest.metric, dayByDate.get(date));
        if (check.met && check.final && earns(date)) {
          complete(quest, date);
        }
      }

      const todayDay = dayByDate.get(today);
      let state: QuestStatus['state'] = checkDay(quest.metric, todayDay).met ? 'settling' : 'open';

      if (isDone(quest, today)) {
        state = 'done';
      }

      statuses.push({
        quest,
        periodKey: today,
        state,
        progress: dayProgress(quest, todayDay),
        week: null,
        needsData:
          quest.metric === 'within_limits' && !!todayDay?.logged && !checkLimits(todayDay).judged,
        timesDone: 0,
      });
    } else if (quest.kind === 'weekly') {
      for (const weekDay of [addDays(today, -7), today]) {
        const sunday = getWeekDates(weekDay)[6];
        if (countWeek(quest, weekDay).met >= quest.requiredDays && earns(sunday)) {
          complete(quest, getIsoWeekKey(weekDay));
        }
      }

      const { checks, met } = countWeek(quest, today);
      const periodKey = getIsoWeekKey(today);
      statuses.push({
        quest,
        periodKey,
        state: isDone(quest, periodKey) ? 'done' : 'open',
        progress: { value: met, target: quest.requiredDays, unit: 'days' },
        week: checks.map(({ date, check }) => {
          if (date > today) return 'future';
          if (check.met && check.final) return 'met';
          return date === today ? 'today' : 'missed';
        }),
        needsData: false,
        timesDone: 0,
      });
    } else {
      statuses.push(evaluateSpecial(quest, input, complete, earns));
    }
  }

  // Count what was recorded, including what is being recorded now.
  for (const status of statuses) {
    if (status.quest.kind === 'special') {
      status.timesDone = [...done].filter((key) => key.startsWith(`${status.quest.id}|`)).length;
      // Level-ups and weight goals repeat; only the account is done for good.
      if (status.quest.metric === 'create_account' && status.timesDone > 0) {
        status.state = 'done';
      }
    } else if (isDone(status.quest, status.periodKey)) {
      status.state = 'done';
    }
  }

  return { statuses, newCompletions };
}

function evaluateSpecial(
  quest: BuddyQuest,
  input: QuestEngineInput,
  complete: (quest: BuddyQuest, periodKey: string) => void,
  earns: (dateKey: string) => boolean
): QuestStatus {
  const base: QuestStatus = {
    quest,
    periodKey: 'once',
    state: 'open',
    progress: null,
    week: null,
    needsData: false,
    timesDone: 0,
  };

  switch (quest.metric) {
    case 'pet_level_up':
      for (let level = 2; level <= Math.min(input.level, MAX_LEVEL); level += 1) {
        complete(quest, `level-${level}`);
      }
      return { ...base, periodKey: `level-${input.level + 1}` };
    case 'weight_goal_reached':
      for (const goal of input.completedGoals) {
        if (earns(formatDateKey(goal.completedAt))) {
          complete(quest, goal.id);
        }
      }
      return base;
    case 'create_account':
      if (input.hasAccount) {
        complete(quest, 'once');
      }
      return base;
    default:
      return base;
  }
}

/** Quests of one kind, in display order. */
export function filterStatuses(statuses: QuestStatus[], kind: QuestKind) {
  return statuses
    .filter((status) => status.quest.kind === kind)
    .sort((first, second) => first.quest.sortOrder - second.quest.sortOrder);
}

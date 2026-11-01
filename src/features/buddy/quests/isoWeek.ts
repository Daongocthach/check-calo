import { addDays } from '@/features/goals/utils/weightGoal';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Monday 0 … Sunday 6. */
function weekdayIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7;
}

/** The ISO week of a YYYY-MM-DD day as `YYYY-Www`, the same as Postgres `IYYY-"W"IW`. */
export function getIsoWeekKey(dateKey: string) {
  const thursday = toUtcDate(dateKey);
  thursday.setUTCDate(thursday.getUTCDate() - weekdayIndex(thursday) + 3);
  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - weekdayIndex(firstThursday) + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));

  return `${weekYear}-W${String(week).padStart(2, '0')}`;
}

/** Monday through Sunday of the week holding a YYYY-MM-DD day. */
export function getWeekDates(dateKey: string) {
  const monday = addDays(dateKey, -weekdayIndex(toUtcDate(dateKey)));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

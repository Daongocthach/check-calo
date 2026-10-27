export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `date`, at local midnight. */
export function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** Monday-based week containing `date`, as 7 Date objects at local midnight. */
export function getWeekDays(date: Date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Mondays from the week of `from` through the week of `to`, oldest first. */
export function getWeekStarts(from: Date, to: Date) {
  const weeks: Date[] = [];
  const last = getWeekStart(to);
  for (let week = getWeekStart(from); week <= last; week = addDays(week, 7)) {
    weeks.push(week);
  }
  return weeks;
}

export function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

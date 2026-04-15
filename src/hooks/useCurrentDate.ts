import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const CURRENT_DATE_REFRESH_INTERVAL_MS = 60 * 1000;
const NEXT_DAY_BUFFER_MS = 1000;

function isSameCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const refreshCurrentDate = () => {
      const nextDate = new Date();
      setCurrentDate((previousDate) =>
        isSameCalendarDate(previousDate, nextDate) ? previousDate : nextDate
      );
    };

    const getDelayUntilNextDay = () => {
      const nextDate = new Date();
      const nextMidnight = new Date(nextDate);
      nextMidnight.setHours(24, 0, 0, NEXT_DAY_BUFFER_MS);
      return Math.max(nextMidnight.getTime() - nextDate.getTime(), 0);
    };

    let nextDayTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNextDayRefresh = () => {
      if (nextDayTimeoutId) {
        clearTimeout(nextDayTimeoutId);
      }

      nextDayTimeoutId = setTimeout(() => {
        refreshCurrentDate();
        scheduleNextDayRefresh();
      }, getDelayUntilNextDay());
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshCurrentDate();
        scheduleNextDayRefresh();
      }
    });

    const intervalId = setInterval(refreshCurrentDate, CURRENT_DATE_REFRESH_INTERVAL_MS);
    scheduleNextDayRefresh();

    return () => {
      subscription.remove();
      clearInterval(intervalId);
      if (nextDayTimeoutId) {
        clearTimeout(nextDayTimeoutId);
      }
    };
  }, []);

  return currentDate;
}

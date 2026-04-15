import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const CURRENT_DATE_REFRESH_INTERVAL_MS = 60 * 1000;

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

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshCurrentDate();
      }
    });

    const intervalId = setInterval(refreshCurrentDate, CURRENT_DATE_REFRESH_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  return currentDate;
}

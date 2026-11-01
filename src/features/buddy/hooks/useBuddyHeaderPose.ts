import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getAchievementProgress } from '@/features/achievements/services/activityStatsService';
import { formatDateKey } from '@/utils/date';
import { STORAGE_KEYS, useStorage } from '@/utils/storage';
import {
  detectHeaderEvents,
  getHeaderPose,
  getNextPoseChange,
  isStreakMilestoneDay,
} from '../utils/headerPose';
import type { HeaderSeenState } from '../utils/headerPose';
import { useBuddyProgress } from './useBuddyProgress';

/** Margin so the timer lands just inside the next slot rather than on its edge. */
const SLOT_CHANGE_BUFFER_MS = 1000;

/** The current time, refreshed when the header pose is due to change and when the app returns. */
function usePoseClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timeoutId = setTimeout(
      () => setNow(new Date()),
      getNextPoseChange(now).getTime() - Date.now() + SLOT_CHANGE_BUFFER_MS
    );
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.remove();
    };
  }, [now]);

  return now;
}

/** Buddy's pose for the dashboard header: the time of day, or today's level-up, badge or streak. */
export function useBuddyHeaderPose() {
  const now = usePoseClock();
  const todayKey = formatDateKey(now);
  const { stats, progress } = useBuddyProgress();
  const seen = useStorage<HeaderSeenState>(STORAGE_KEYS.app.buddyHeaderSeen);
  const level = progress?.current.level ?? null;
  const unlockedCount = stats
    ? getAchievementProgress(stats).filter((item) => item.unlocked).length
    : null;
  const detected =
    !seen.loading && level !== null && unlockedCount !== null
      ? detectHeaderEvents(seen.value, { level, unlockedCount }, todayKey)
      : null;
  const next = detected?.next;
  const { value: stored, setValue: setSeen } = seen;

  useEffect(() => {
    if (
      next &&
      (stored?.level !== next.level ||
        stored.unlockedCount !== next.unlockedCount ||
        stored.levelUpDate !== next.levelUpDate ||
        stored.badgeDate !== next.badgeDate)
    ) {
      setSeen(next);
    }
  }, [next, stored, setSeen]);

  return {
    pose: getHeaderPose(now, {
      leveledUp: detected?.leveledUp ?? false,
      badgeUnlocked: detected?.badgeUnlocked ?? false,
      streakMilestone: stats ? isStreakMilestoneDay(stats, todayKey) : false,
    }),
    level,
  };
}

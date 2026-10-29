import { syncUserProfileToCloud } from '@/features/food-log/services/foodLogDeltaSync';
import {
  rebaselineActiveGoal,
  syncActiveGoalToProfile,
  type GoalSyncOptions,
} from '@/features/goals/services/goalTrackingService';
import { getLatestWeightLog, upsertWeightLog } from '@/features/goals/services/weightLogRepository';
import { pushPendingWeightLogs } from '@/features/goals/services/weightLogSync';
import { addDays } from '@/features/goals/utils/weightGoal';
import { syncCurrentUserLeaderboardProfile } from '@/features/leaderboard/services/leaderboardService';
import { formatDateKey } from '@/utils/date';
import type { UserProfile, UserProfileInput } from '../types';
import { getProfileDayPlan, getWeightGoalMode } from '../utils/calorie';
import { recordDailyTarget } from './dailyTargetRepository';
import {
  getUserProfile,
  setTransitionUntil,
  toUserProfileInput,
  upsertUserProfile,
} from './profileRepository';

/** Days at maintenance after switching between losing and gaining. */
export const TRANSITION_DAYS = 14;

export interface SaveProfileOptions extends GoalSyncOptions {
  /**
   * When the plan switches between losing and gaining, eat at maintenance for
   * TRANSITION_DAYS first; the new goal starts after that.
   */
  transition?: boolean;
}

/** A weight typed into the profile counts as today's weigh-in when it differs from the last. */
async function recordProfileWeight(weightKg: number) {
  const latest = await getLatestWeightLog();

  if (latest?.weightKg === weightKg) {
    return;
  }

  await upsertWeightLog(formatDateKey(new Date()), weightKg);
  void pushPendingWeightLogs();
}

/** Starts or clears the maintenance phase when the plan changes direction. */
async function updateTransition(input: UserProfileInput, transition: boolean) {
  const previous = await getUserProfile();
  const previousMode = previous ? getWeightGoalMode(previous.monthlyWeightGoalKg) : null;
  const nextMode = getWeightGoalMode(input.monthlyWeightGoalKg);

  if (!previous || previousMode === nextMode) {
    return;
  }

  const reversesDirection = previousMode !== 'maintain' && nextMode !== 'maintain';
  await setTransitionUntil(
    transition && reversesDirection ? addDays(formatDateKey(new Date()), TRANSITION_DAYS) : null
  );
}

/** Saves the profile locally, re-aligns the active weight goal and mirrors it to the cloud. */
export async function saveProfile(
  input: UserProfileInput,
  { transition = false, ...goalOptions }: SaveProfileOptions = {}
) {
  await updateTransition(input, transition);
  const profile = await upsertUserProfile(input);

  if (profile) {
    // Today follows the new plan; earlier days keep theirs.
    await recordDailyTarget(getProfileDayPlan(profile));
    await recordProfileWeight(profile.weightKg);
    await syncActiveGoalToProfile(profile, goalOptions);
    await syncCurrentUserLeaderboardProfile(profile, 0, 0);
    void syncUserProfileToCloud(input);
  }

  return profile;
}

/** Ends the maintenance phase: the goal's calories apply and it starts from today's weight. */
export async function endTransition(profile: UserProfile) {
  await setTransitionUntil(null);
  const saved = await saveProfile(toUserProfileInput(profile));

  if (saved) {
    await rebaselineActiveGoal(saved);
  }
}

/** After reaching the target weight, the plan switches to holding it. */
export function maintainReachedWeight(profile: UserProfile) {
  return saveProfile({
    ...toUserProfileInput(profile),
    monthlyWeightGoalKg: 0,
    targetWeightKg: null,
  });
}

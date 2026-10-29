import { syncUserProfileToCloud } from '@/features/food-log/services/foodLogDeltaSync';
import { syncActiveGoalToProfile } from '@/features/goals/services/goalTrackingService';
import { getLatestWeightLog, upsertWeightLog } from '@/features/goals/services/weightLogRepository';
import { pushPendingWeightLogs } from '@/features/goals/services/weightLogSync';
import { syncCurrentUserLeaderboardProfile } from '@/features/leaderboard/services/leaderboardService';
import { formatDateKey } from '@/utils/date';
import type { UserProfileInput } from '../types';
import { getProfileDayPlan } from '../utils/calorie';
import { recordDailyTarget } from './dailyTargetRepository';
import { upsertUserProfile } from './profileRepository';

/** A weight typed into the profile counts as today's weigh-in when it differs from the last. */
async function recordProfileWeight(weightKg: number) {
  const latest = await getLatestWeightLog();

  if (latest?.weightKg === weightKg) {
    return;
  }

  await upsertWeightLog(formatDateKey(new Date()), weightKg);
  void pushPendingWeightLogs();
}

/** Saves the profile locally, re-aligns the active weight goal and mirrors it to the cloud. */
export async function saveProfile(input: UserProfileInput) {
  const profile = await upsertUserProfile(input);

  if (profile) {
    // Today follows the new plan; earlier days keep theirs.
    await recordDailyTarget(getProfileDayPlan(profile));
    await recordProfileWeight(profile.weightKg);
    await syncActiveGoalToProfile(profile);
    await syncCurrentUserLeaderboardProfile(profile, 0, 0);
    void syncUserProfileToCloud(input);
  }

  return profile;
}

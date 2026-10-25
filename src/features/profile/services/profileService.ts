import { syncUserProfileToCloud } from '@/features/food-log/services/foodLogDeltaSync';
import { syncActiveGoalToProfile } from '@/features/goals/services/goalTrackingService';
import { syncCurrentUserLeaderboardProfile } from '@/features/leaderboard/services/leaderboardService';
import type { UserProfileInput } from '../types';
import { upsertUserProfile } from './profileRepository';

/** Saves the profile locally, re-aligns the active weight goal and mirrors it to the cloud. */
export async function saveProfile(input: UserProfileInput) {
  const profile = await upsertUserProfile(input);

  if (profile) {
    await syncActiveGoalToProfile(profile);
    await syncCurrentUserLeaderboardProfile(profile, 0, 0);
    void syncUserProfileToCloud(input);
  }

  return profile;
}

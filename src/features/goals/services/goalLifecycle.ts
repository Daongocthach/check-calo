import { getUserProfile } from '@/features/profile/services/profileRepository';
import { endTransition, maintainReachedWeight } from '@/features/profile/services/profileService';
import { isInTransition } from '@/features/profile/utils/calorie';
import type { GoalTrackingSnapshot } from '../types';
import { syncGoalTracking } from './goalTrackingService';

/**
 * Brings goals up to date: ends a finished maintenance phase, checks progress, and after a
 * weight target is reached switches the plan to holding that weight.
 */
export async function refreshGoalTracking(): Promise<GoalTrackingSnapshot> {
  const profile = await getUserProfile();

  if (profile?.transitionUntil && !isInTransition(profile)) {
    await endTransition(profile);
  }

  const snapshot = await syncGoalTracking();
  const reached = snapshot.justCompletedGoal;

  if (!reached || reached.goal.mode === 'maintain') {
    return snapshot;
  }

  const current = await getUserProfile();

  if (current) {
    await maintainReachedWeight(current);
  }

  return { ...(await syncGoalTracking()), justCompletedGoal: reached };
}

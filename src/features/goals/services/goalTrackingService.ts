import { listDailyNutritionSummaries } from '@/features/food-log/services/dailySummaryService';
import { syncCurrentUserLeaderboardProfile } from '@/features/leaderboard/services/leaderboardService';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import type { UserProfile } from '@/features/profile/types';
import { getWeightGoalMode, isInTransition } from '@/features/profile/utils/calorie';
import { formatDateKey, nowIsoString } from '@/utils/date';
import type {
  AchievementKey,
  GoalTrackingSnapshot,
  WeightGoal,
  WeightGoalMode,
  WeightGoalProgress,
  WeightLog,
} from '../types';
import { calculateGoalProgress, getStreakFromSummaries } from '../utils/goalProgress';
import {
  addDays,
  calculateTrendWeight,
  daysBetween,
  MAINTAIN_GOAL_DAYS,
  roundKg,
} from '../utils/weightGoal';
import {
  completeWeightGoal,
  getActiveWeightGoal,
  getLatestCompletedWeightGoal,
  listAchievementUnlocks,
  listHistoricalWeightGoals,
  replaceActiveWeightGoal,
  unlockAchievement,
  updateWeightGoalPlan,
  type WeightGoalPlan,
} from './goalTrackingRepository';
import { listWeightLogs } from './weightLogRepository';

const KCAL_PER_KG = 7700;
const DAYS_PER_MONTH = 30;
const DEFAULT_TARGET_KG = 1;

async function markGoalCompleted(goal: WeightGoalProgress): Promise<WeightGoalProgress> {
  const completedAt = await completeWeightGoal(goal.goal.id);

  return {
    ...goal,
    goal: { ...goal.goal, status: 'completed', completedAt, updatedAt: completedAt },
    completed: true,
  };
}

async function getGoalProgress(
  goal: WeightGoal,
  profile: UserProfile,
  endedAt?: string | null
): Promise<WeightGoalProgress> {
  const endDateKey = formatDateKey(endedAt ?? new Date());
  const summaries =
    goal.mode === 'maintain'
      ? []
      : await listDailyNutritionSummaries(formatDateKey(goal.startedAt), endDateKey);

  return calculateGoalProgress(goal, summaries, profile.maintenanceCalorieTarget, endDateKey);
}

function getPlannedTargetWeightKg(mode: WeightGoalMode, profile: UserProfile) {
  if (mode === 'maintain') {
    return profile.weightKg;
  }

  if (profile.targetWeightKg !== null) {
    return profile.targetWeightKg;
  }

  // Profiles saved before target weights aim a month of change (at least 1 kg) away.
  const fallbackChangeKg = Math.max(DEFAULT_TARGET_KG, Math.abs(profile.monthlyWeightGoalKg));
  return mode === 'lose'
    ? profile.weightKg - fallbackChangeKg
    : profile.weightKg + fallbackChangeKg;
}

/** Days the change takes at the monthly rate; a month for maintain goals. */
function getPlannedDays(
  mode: WeightGoalMode,
  fromKg: number,
  targetWeightKg: number,
  monthlyRateKg: number
) {
  if (mode === 'maintain') {
    return MAINTAIN_GOAL_DAYS;
  }

  const rate = Math.abs(monthlyRateKg);
  return rate > 0 ? Math.round((Math.abs(fromKg - targetWeightKg) / rate) * DAYS_PER_MONTH) : 0;
}

/**
 * Where a new goal starts: the last week's average weigh-in, so one day's water swing does
 * not set it. Falls back to the profile weight when that average is already past the target.
 */
function getStartWeightKg(mode: WeightGoalMode, profile: UserProfile, logs: WeightLog[]) {
  const trendKg = calculateTrendWeight(logs, addDays(formatDateKey(new Date()), -6));
  const targetKg = getPlannedTargetWeightKg(mode, profile);

  if (
    trendKg === null ||
    (mode === 'lose' && trendKg <= targetKg) ||
    (mode === 'gain' && trendKg >= targetKg)
  ) {
    return profile.weightKg;
  }

  return trendKg;
}

function buildGoalPlan(
  mode: WeightGoalMode,
  profile: UserProfile,
  startWeightKg: number
): WeightGoalPlan {
  const roundedStartKg = roundKg(startWeightKg);
  const targetWeightKg =
    mode === 'maintain' ? roundedStartKg : roundKg(getPlannedTargetWeightKg(mode, profile));
  const targetKg = mode === 'maintain' ? null : roundKg(Math.abs(roundedStartKg - targetWeightKg));
  const monthlyRateKg = Math.abs(profile.monthlyWeightGoalKg);

  return {
    targetKg,
    targetKcalDelta: targetKg ? Math.round(targetKg * KCAL_PER_KG) : 0,
    targetDays: getPlannedDays(mode, roundedStartKg, targetWeightKg, monthlyRateKg),
    startWeightKg: roundedStartKg,
    targetWeightKg,
    monthlyRateKg,
  };
}

/** Whether a goal already follows the profile's mode, target weight and rate. */
function followsProfilePlan(goal: WeightGoal, mode: WeightGoalMode, profile: UserProfile) {
  if (goal.startWeightKg === null || goal.mode !== mode) {
    return false;
  }

  if (mode === 'maintain') {
    return true;
  }

  const sameTarget =
    profile.targetWeightKg === null ||
    (goal.targetWeightKg !== null &&
      roundKg(goal.targetWeightKg) === roundKg(profile.targetWeightKg));

  return sameTarget && goal.monthlyRateKg === Math.abs(profile.monthlyWeightGoalKg);
}

/**
 * A new target weight or rate in the same direction edits the running goal: its start stays,
 * and its length becomes the days so far plus the rest at the new rate.
 */
async function updateGoalPlan(goal: WeightGoal, profile: UserProfile, logs: WeightLog[]) {
  if (goal.mode === 'maintain' || profile.targetWeightKg === null) {
    return;
  }

  if (followsProfilePlan(goal, goal.mode, profile)) {
    return;
  }

  const startDate = formatDateKey(goal.startedAt);
  const startKg = goal.startWeightKg ?? profile.weightKg;
  const currentKg = calculateTrendWeight(logs, startDate) ?? startKg;
  const targetWeightKg = roundKg(profile.targetWeightKg);
  const monthlyRateKg = Math.abs(profile.monthlyWeightGoalKg);
  const targetKg = roundKg(Math.abs(startKg - targetWeightKg));
  const elapsedDays = Math.max(0, daysBetween(startDate, formatDateKey(new Date())));

  await updateWeightGoalPlan(goal.id, {
    targetWeightKg,
    monthlyRateKg,
    targetKg,
    targetKcalDelta: Math.round(targetKg * KCAL_PER_KG),
    targetDays: elapsedDays + getPlannedDays(goal.mode, currentKg, targetWeightKg, monthlyRateKg),
  });
}

export interface GoalSyncOptions {
  /** Start over from the current weight even when the direction stays the same. */
  restart?: boolean;
}

/**
 * Keeps the active goal in line with the profile. The same direction edits the running goal;
 * a new direction, or `restart`, starts a new one. A reached weight target is not restarted
 * until the user picks a new plan. After switching between losing and gaining, the new goal
 * starts when the maintenance phase ends.
 */
export async function syncActiveGoalToProfile(
  profile: UserProfile,
  { restart = false }: GoalSyncOptions = {}
) {
  const activeGoal = await getActiveWeightGoal();
  const mode = getWeightGoalMode(profile.monthlyWeightGoalKg);
  const logs = await listWeightLogs();

  if (activeGoal && !restart && activeGoal.startWeightKg !== null && activeGoal.mode === mode) {
    await updateGoalPlan(activeGoal, profile, logs);
    return;
  }

  if (!activeGoal && !restart && mode !== 'maintain') {
    const latestCompletedGoal = await getLatestCompletedWeightGoal();

    if (latestCompletedGoal && followsProfilePlan(latestCompletedGoal, mode, profile)) {
      return;
    }
  }

  const startedAt =
    profile.transitionUntil && isInTransition(profile)
      ? new Date(`${profile.transitionUntil}T00:00:00`).toISOString()
      : nowIsoString();

  await replaceActiveWeightGoal(
    mode,
    buildGoalPlan(mode, profile, getStartWeightKg(mode, profile, logs)),
    startedAt
  );
}

/** When the maintenance phase ends, the goal starts from the weight reached by then. */
export async function rebaselineActiveGoal(profile: UserProfile) {
  const activeGoal = await getActiveWeightGoal();

  if (!activeGoal || activeGoal.startWeightKg === null || activeGoal.mode === 'maintain') {
    return;
  }

  const { startWeightKg, targetKg, targetKcalDelta, targetDays } = buildGoalPlan(
    activeGoal.mode,
    profile,
    getStartWeightKg(activeGoal.mode, profile, await listWeightLogs())
  );

  await updateWeightGoalPlan(activeGoal.id, {
    startWeightKg,
    targetKg,
    targetKcalDelta,
    targetDays,
  });
}

export async function syncGoalTracking(): Promise<GoalTrackingSnapshot> {
  const profile = await getUserProfile();

  if (!profile) {
    return {
      activeGoal: null,
      latestCompletedGoal: null,
      goalHistory: [],
      currentStreak: 0,
      unlockedAchievements: await listAchievementUnlocks(),
      newlyUnlockedAchievements: [],
      justCompletedGoal: null,
    };
  }

  await syncActiveGoalToProfile(profile);

  const achievementKeys: AchievementKey[] = [];
  const allRecentSummaries = await listDailyNutritionSummaries(
    formatDateKey(new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)),
    formatDateKey(new Date())
  );
  const currentStreak = getStreakFromSummaries(allRecentSummaries, profile);

  if (currentStreak >= 7 && (await unlockAchievement('fire_keeper_7'))) {
    achievementKeys.push('fire_keeper_7');
  }

  if (currentStreak >= 14 && (await unlockAchievement('fire_keeper_14'))) {
    achievementKeys.push('fire_keeper_14');
  }

  let justCompletedGoal: WeightGoalProgress | null = null;
  let activeGoalSnapshot: WeightGoalProgress | null = null;
  const activeGoal = await getActiveWeightGoal();

  if (activeGoal) {
    const progress = await getGoalProgress(activeGoal, profile);

    if (progress.completed) {
      justCompletedGoal = await markGoalCompleted(progress);

      if (await unlockAchievement('goal_crusher')) {
        achievementKeys.push('goal_crusher');
      }

      if (justCompletedGoal.goal.mode === 'maintain') {
        if (await unlockAchievement('first_maintain_goal')) {
          achievementKeys.push('first_maintain_goal');
        }
      }
    } else {
      activeGoalSnapshot = progress;
    }
  }

  const completedGoal = await getLatestCompletedWeightGoal();
  let latestCompletedGoal: WeightGoalProgress | null = null;

  if (completedGoal) {
    latestCompletedGoal = await getGoalProgress(
      completedGoal,
      profile,
      completedGoal.completedAt ?? completedGoal.updatedAt
    );
  }

  const historicalGoals = await listHistoricalWeightGoals();
  const goalHistory = await Promise.all(
    historicalGoals.map((goal) =>
      getGoalProgress(goal, profile, goal.completedAt ?? goal.updatedAt)
    )
  );
  const completedGoals = goalHistory.filter((goal) => goal.completed).length;

  await syncCurrentUserLeaderboardProfile(profile, currentStreak, completedGoals);

  return {
    activeGoal: activeGoalSnapshot,
    latestCompletedGoal,
    goalHistory,
    currentStreak,
    unlockedAchievements: await listAchievementUnlocks(),
    newlyUnlockedAchievements: achievementKeys,
    justCompletedGoal,
  };
}

import { getDatabase } from '@/services/database/sqlite';
import { formatDateKey, nowIsoString } from '@/utils/date';
import type { DailyTargetOverride, UserProfile, UserProfileInput } from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  calculateMaintenanceCalorieTarget,
  getActivityFactor,
  isInTransition,
} from '../utils/calorie';

interface UserProfileRow {
  id: number;
  display_name: string;
  gender: UserProfile['gender'];
  age: number;
  height_cm: number;
  weight_kg: number;
  monthly_weight_loss_kg: number;
  target_weight_kg: number | null;
  activity_level: UserProfile['activityLevel'];
  activity_factor: number;
  bmi: number;
  maintenance_calorie_target: number;
  daily_calorie_target: number;
  protein_target_grams: number;
  carbs_target_grams: number;
  fat_target_grams: number;
  transition_until: string | null;
  created_at: string;
  updated_at: string;
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    gender: row.gender,
    age: row.age,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    monthlyWeightGoalKg: row.monthly_weight_loss_kg,
    targetWeightKg: row.target_weight_kg,
    activityLevel: row.activity_level,
    activityFactor: row.activity_factor,
    bmi: row.bmi,
    maintenanceCalorieTarget: row.maintenance_calorie_target,
    dailyCalorieTarget: row.daily_calorie_target,
    proteinTargetGrams: row.protein_target_grams,
    carbsTargetGrams: row.carbs_target_grams,
    fatTargetGrams: row.fat_target_grams,
    transitionUntil: row.transition_until ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserProfile() {
  const database = await getDatabase();
  const row = await database.getFirstAsync<UserProfileRow>(
    'SELECT * FROM user_profile WHERE id = 1 LIMIT 1;'
  );

  return row ? mapProfile(row) : null;
}

/** Saves the profile; during a transition the daily targets stay at maintenance. */
export async function upsertUserProfile(profile: UserProfileInput) {
  const database = await getDatabase();
  const now = nowIsoString();
  const existing = await database.getFirstAsync<Pick<UserProfileRow, 'transition_until'>>(
    'SELECT transition_until FROM user_profile WHERE id = 1 LIMIT 1;'
  );
  const bmi = Number(calculateBmi(profile.heightCm, profile.weightKg).toFixed(1));
  const maintenanceCalorieTarget = calculateMaintenanceCalorieTarget(profile);
  const dailyCalorieTarget = isInTransition({ transitionUntil: existing?.transition_until ?? null })
    ? maintenanceCalorieTarget
    : calculateDailyCalorieTarget(profile);
  const activityFactor = getActivityFactor(profile.activityLevel);
  const { proteinTargetGrams, carbsTargetGrams, fatTargetGrams } = calculateMacroTargets(
    profile,
    dailyCalorieTarget
  );

  await database.runAsync(
    `
      INSERT INTO user_profile (
        id,
        display_name,
        gender,
        age,
        height_cm,
        weight_kg,
        monthly_weight_loss_kg,
        target_weight_kg,
        activity_level,
        activity_factor,
        bmi,
        maintenance_calorie_target,
        daily_calorie_target,
        protein_target_grams,
        carbs_target_grams,
        fat_target_grams,
        created_at,
        updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        gender = excluded.gender,
        age = excluded.age,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        monthly_weight_loss_kg = excluded.monthly_weight_loss_kg,
        target_weight_kg = excluded.target_weight_kg,
        activity_level = excluded.activity_level,
        activity_factor = excluded.activity_factor,
        bmi = excluded.bmi,
        maintenance_calorie_target = excluded.maintenance_calorie_target,
        daily_calorie_target = excluded.daily_calorie_target,
        protein_target_grams = excluded.protein_target_grams,
        carbs_target_grams = excluded.carbs_target_grams,
        fat_target_grams = excluded.fat_target_grams,
        updated_at = excluded.updated_at;
    `,
    [
      profile.displayName,
      profile.gender,
      profile.age,
      profile.heightCm,
      profile.weightKg,
      profile.monthlyWeightGoalKg,
      profile.targetWeightKg,
      profile.activityLevel,
      activityFactor,
      bmi,
      maintenanceCalorieTarget,
      dailyCalorieTarget,
      proteinTargetGrams,
      carbsTargetGrams,
      fatTargetGrams,
      now,
      now,
    ]
  );

  return getUserProfile();
}

/** The editable part of a saved profile, e.g. to save it again with a new weight. */
export function toUserProfileInput(profile: UserProfile): UserProfileInput {
  return {
    displayName: profile.displayName,
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    monthlyWeightGoalKg: profile.monthlyWeightGoalKg,
    targetWeightKg: profile.targetWeightKg,
    activityLevel: profile.activityLevel,
  };
}

/** Starts (YYYY-MM-DD end date) or ends (null) the maintenance phase; save the profile after. */
export async function setTransitionUntil(dateKey: string | null) {
  const database = await getDatabase();

  await database.runAsync('UPDATE user_profile SET transition_until = ? WHERE id = 1;', [dateKey]);
}

export async function deleteUserProfile() {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM daily_calorie_targets;');
    await database.runAsync('DELETE FROM user_profile WHERE id = 1;');
  });
}

export async function upsertDailyTargetOverride(date: string, calorieTarget: number) {
  const database = await getDatabase();
  const now = nowIsoString();
  const normalizedDate = formatDateKey(date);

  await database.runAsync(
    `
      INSERT INTO daily_calorie_targets (date, calorie_target, source, created_at, updated_at)
      VALUES (?, ?, 'manual', ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        calorie_target = excluded.calorie_target,
        source = excluded.source,
        updated_at = excluded.updated_at;
    `,
    [normalizedDate, calorieTarget, now, now]
  );

  return {
    date: normalizedDate,
    calorieTarget,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  } satisfies DailyTargetOverride;
}

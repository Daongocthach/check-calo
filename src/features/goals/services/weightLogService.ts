import { getUserProfile, toUserProfileInput } from '@/features/profile/services/profileRepository';
import { saveProfile } from '@/features/profile/services/profileService';
import { formatDateKey } from '@/utils/date';
import { roundKg } from '../utils/weightGoal';
import { getLatestWeightLog, upsertWeightLog } from './weightLogRepository';
import { pushPendingWeightLogs } from './weightLogSync';

export const MIN_WEIGHT_KG = 25;
export const MAX_WEIGHT_KG = 250;

/** Reads a typed weight, accepting a comma as decimal separator. Null when out of range. */
export function parseWeightInput(value: string) {
  const weightKg = Number(value.trim().replace(',', '.'));

  if (!Number.isFinite(weightKg) || weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return null;
  }

  return roundKg(weightKg);
}

/**
 * Saves a weigh-in. The newest one also becomes the profile weight, so calorie and macro
 * targets follow the weight as it changes.
 */
export async function logWeight(weightKg: number, date: string = formatDateKey(new Date())) {
  const log = await upsertWeightLog(date, roundKg(weightKg));
  const [latest, profile] = await Promise.all([getLatestWeightLog(), getUserProfile()]);

  if (profile && latest?.date === log.date && profile.weightKg !== log.weightKg) {
    await saveProfile({ ...toUserProfileInput(profile), weightKg: log.weightKg });
  }

  void pushPendingWeightLogs();
  return log;
}

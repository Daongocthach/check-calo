import type { ActivityLevel, Gender } from './types';

export const ACTIVITY_LEVEL_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LEVEL_KEYS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

export const GENDER_KEYS: Gender[] = ['male', 'female', 'other'];

export const MONTHLY_WEIGHT_LOSS_OPTIONS = [1, 0.5, 0, -0.5, -1] as const;

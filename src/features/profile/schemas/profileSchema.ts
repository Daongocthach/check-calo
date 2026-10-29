import { z } from 'zod';

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(1, 'validation.required').max(40),
  age: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .refine((value) => {
      const age = Number(value);
      return Number.isInteger(age) && age >= 10 && age <= 100;
    }, 'onboarding.validation.age'),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(100).max(230),
  weightKg: z.number().min(25).max(250),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goalMode: z.enum(['lose', 'maintain', 'gain']),
  targetWeightKg: z.number().min(25).max(250),
  /** How long the change takes; 0 when maintaining. */
  weeks: z.number().int().min(0).max(52),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

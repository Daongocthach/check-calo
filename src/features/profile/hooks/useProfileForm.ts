import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { planFromDraft, type GoalDraft } from '@/features/goals/utils/goalPlan';
import { profileFormSchema, type ProfileFormValues } from '../schemas/profileSchema';
import { saveProfile } from '../services/profileService';
import type { UserProfileInput } from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  getCalorieRange,
  type BodyStats,
  type CalorieRange,
} from '../utils/calorie';

const DEFAULT_VALUES: ProfileFormValues = {
  displayName: '',
  age: '25',
  gender: 'male',
  heightCm: 170,
  weightKg: 65,
  activityLevel: 'moderate',
  goalMode: 'lose',
  targetWeightKg: 62,
  weeks: 0,
};

/** The body stats the plan is sized for; an unfinished age counts as 25. */
export function toBodyStats(values: ProfileFormValues): BodyStats {
  const age = Number(values.age);

  return {
    gender: values.gender,
    age: Number.isInteger(age) && age > 0 ? age : 25,
    heightCm: values.heightCm,
    weightKg: values.weightKg,
    activityLevel: values.activityLevel,
  };
}

export function toGoalDraft(values: ProfileFormValues): GoalDraft {
  return { mode: values.goalMode, targetWeightKg: values.targetWeightKg, weeks: values.weeks };
}

export function toProfileInput(values: ProfileFormValues): UserProfileInput {
  const body = toBodyStats(values);

  return {
    ...body,
    displayName: values.displayName.trim(),
    ...planFromDraft(body, toGoalDraft(values)),
  };
}

export interface ProfilePlan {
  bmi: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Daily calories that still count as on target. */
  calorieRange: CalorieRange;
}

/** The first-run form: body stats, then the goal, then the resulting plan. */
export function useProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });
  const values = form.watch();
  const input = toProfileInput(values);
  const macros = calculateMacroTargets(input);
  const dailyCalories = calculateDailyCalorieTarget(input);
  const plan: ProfilePlan = {
    bmi: Number(calculateBmi(input.heightCm, input.weightKg).toFixed(1)),
    dailyCalories,
    proteinGrams: macros.proteinTargetGrams,
    carbsGrams: macros.carbsTargetGrams,
    fatGrams: macros.fatTargetGrams,
    calorieRange: getCalorieRange(input, dailyCalories),
  };

  /** Resolves `true` after saving, `false` when validation fails. */
  const submit = () =>
    new Promise<boolean>((resolve, reject) => {
      void form.handleSubmit(
        async (formValues) => {
          try {
            await saveProfile(toProfileInput(formValues));
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        () => resolve(false)
      )();
    });

  return { form, plan, submit };
}

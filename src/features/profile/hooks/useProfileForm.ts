import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { WeightGoalMode } from '@/features/goals/types';
import { estimateGoalEndDate } from '@/features/goals/utils/weightGoal';
import { formatDateKey } from '@/utils/date';
import { profileFormSchema, type ProfileFormValues } from '../schemas/profileSchema';
import { getUserProfile } from '../services/profileRepository';
import { saveProfile } from '../services/profileService';
import type { UserProfile, UserProfileInput } from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  getCalorieRange,
  getWeightGoalMode,
  type CalorieRange,
} from '../utils/calorie';

const DEFAULT_VALUES: ProfileFormValues = {
  displayName: '',
  age: '25',
  gender: 'male',
  heightCm: 170,
  weightKg: 65,
  goalMode: 'lose',
  monthlyRateKg: 1,
  targetWeightKg: 60,
  activityLevel: 'moderate',
};

/** Target weight slider bounds: below the current weight to lose, above it to gain. */
export function getTargetWeightBounds(goalMode: WeightGoalMode, weightKg: number) {
  return goalMode === 'gain'
    ? { min: Math.round(weightKg) + 1, max: 160 }
    : { min: 25, max: Math.round(weightKg) - 1 };
}

/** A starting target for the slider: about 5% lighter, or 3 kg heavier. */
function suggestTargetWeight(goalMode: WeightGoalMode, weightKg: number) {
  return goalMode === 'gain'
    ? Math.round(weightKg) + 3
    : Math.round(weightKg - Math.max(1, weightKg * 0.05));
}

function toRate(monthlyWeightGoalKg: number): ProfileFormValues['monthlyRateKg'] {
  const absolute = Math.abs(monthlyWeightGoalKg);
  if (absolute >= 2) return 2;
  if (absolute >= 1) return 1;
  return 0.5;
}

function fromProfile(profile: UserProfile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    age: String(profile.age),
    gender: profile.gender,
    heightCm: Math.round(profile.heightCm),
    weightKg: Math.round(profile.weightKg),
    goalMode: getWeightGoalMode(profile.monthlyWeightGoalKg),
    monthlyRateKg: toRate(profile.monthlyWeightGoalKg),
    targetWeightKg: Math.round(
      profile.targetWeightKg ??
        suggestTargetWeight(getWeightGoalMode(profile.monthlyWeightGoalKg), profile.weightKg)
    ),
    activityLevel: profile.activityLevel,
  };
}

function toMonthlyGoal(goalMode: WeightGoalMode, rate: number) {
  if (goalMode === 'maintain') return 0;
  // Positive = lose weight, negative = gain weight (see UserProfileInput).
  return goalMode === 'lose' ? rate : -rate;
}

export function toProfileInput(values: ProfileFormValues): UserProfileInput {
  return {
    displayName: values.displayName.trim(),
    gender: values.gender,
    age: Number(values.age) || 0,
    heightCm: values.heightCm,
    weightKg: values.weightKg,
    monthlyWeightGoalKg: toMonthlyGoal(values.goalMode, values.monthlyRateKg),
    targetWeightKg: values.goalMode === 'maintain' ? null : values.targetWeightKg,
    activityLevel: values.activityLevel,
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
  /** YYYY-MM-DD the target weight is reached at the chosen rate; null when maintaining. */
  expectedEndDate: string | null;
}

export function useProfileForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });
  const { reset, watch, getValues, setValue } = form;
  const goalMode = watch('goalMode');
  const weightKg = watch('weightKg');

  useEffect(() => {
    let active = true;

    void getUserProfile()
      .then((profile) => {
        if (!active) return;
        if (profile) {
          reset(fromProfile(profile));
          setHasExistingProfile(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reset]);

  // Keep the target on the right side of the current weight as mode or weight change.
  useEffect(() => {
    if (goalMode === 'maintain') {
      return;
    }

    const { min, max } = getTargetWeightBounds(goalMode, weightKg);
    const target = getValues('targetWeightKg');

    if (target < min || target > max) {
      setValue('targetWeightKg', suggestTargetWeight(goalMode, weightKg), {
        shouldValidate: true,
      });
    }
  }, [goalMode, weightKg, getValues, setValue]);

  const input = toProfileInput(watch());
  const planInput = { ...input, age: input.age > 0 ? input.age : 25 };
  const macros = calculateMacroTargets(planInput);
  const dailyCalories = calculateDailyCalorieTarget(planInput);
  const plan: ProfilePlan = {
    bmi: Number(calculateBmi(input.heightCm, input.weightKg).toFixed(1)),
    dailyCalories,
    proteinGrams: macros.proteinTargetGrams,
    carbsGrams: macros.carbsTargetGrams,
    fatGrams: macros.fatTargetGrams,
    calorieRange: getCalorieRange(planInput, dailyCalories),
    expectedEndDate:
      input.targetWeightKg === null
        ? null
        : estimateGoalEndDate(
            formatDateKey(new Date()),
            input.weightKg,
            input.targetWeightKg,
            input.monthlyWeightGoalKg
          ),
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

  return { form, plan, isLoading, hasExistingProfile, submit };
}

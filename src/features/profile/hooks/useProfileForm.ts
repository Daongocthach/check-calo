import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { WeightGoalMode } from '@/features/goals/types';
import { profileFormSchema, type ProfileFormValues } from '../schemas/profileSchema';
import { getUserProfile } from '../services/profileRepository';
import { saveProfile } from '../services/profileService';
import type { UserProfile, UserProfileInput } from '../types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  getWeightGoalMode,
} from '../utils/calorie';

const DEFAULT_VALUES: ProfileFormValues = {
  displayName: '',
  age: '25',
  gender: 'male',
  heightCm: 170,
  weightKg: 65,
  goalMode: 'lose',
  monthlyRateKg: 1,
  activityLevel: 'moderate',
};

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
    activityLevel: values.activityLevel,
  };
}

export interface ProfilePlan {
  bmi: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export function useProfileForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  });
  const { reset, watch } = form;

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

  const input = toProfileInput(watch());
  const planInput = { ...input, age: input.age > 0 ? input.age : 25 };
  const macros = calculateMacroTargets(planInput);
  const plan: ProfilePlan = {
    bmi: Number(calculateBmi(input.heightCm, input.weightKg).toFixed(1)),
    dailyCalories: calculateDailyCalorieTarget(planInput),
    proteinGrams: macros.proteinTargetGrams,
    carbsGrams: macros.carbsTargetGrams,
    fatGrams: macros.fatTargetGrams,
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

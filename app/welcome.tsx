import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, Input, ScreenContainer, Text } from '@/common/components';
import { GENDER_KEYS, MONTHLY_WEIGHT_GOAL_OPTIONS } from '@/features/nutrition/constants';
import { syncActiveGoalToProfile } from '@/features/nutrition/services/goalTrackingService';
import { getUserProfile, upsertUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { ActivityLevel, Gender } from '@/features/nutrition/types';
import {
  calculateBmi,
  calculateDailyCalorieTarget,
  calculateMacroTargets,
  calculateMaintenanceCalorieTarget,
} from '@/features/nutrition/utils/calorie';
import { vs } from '@/theme/metrics';

interface ProfileFormState {
  gender: Gender;
  age: string;
  height: string;
  weight: string;
  monthlyWeightGoalKg: number;
  activityLevel: ActivityLevel;
}

const DEFAULT_FORM: ProfileFormState = {
  gender: 'male',
  age: '18',
  height: '170',
  weight: '65',
  monthlyWeightGoalKg: 0,
  activityLevel: 'moderate',
};

interface ProfileSummaryState {
  bmi: number;
  maintenanceCalories: number;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

type ActivityTileLevel = 'sedentary' | 'light' | 'moderate' | 'active';

const ACTIVITY_TILE_LEVELS: ActivityTileLevel[] = ['sedentary', 'light', 'moderate', 'active'];

function getMonthlyWeightGoalPlanKey(value: number) {
  switch (value) {
    case -2:
      return 'welcomeScreen.monthlyWeightPlans.gain_2' as const;
    case -1:
      return 'welcomeScreen.monthlyWeightPlans.gain_1' as const;
    case -0.5:
      return 'welcomeScreen.monthlyWeightPlans.gain_0_5' as const;
    case 0:
      return 'welcomeScreen.monthlyWeightPlans.0' as const;
    case 0.5:
      return 'welcomeScreen.monthlyWeightPlans.lose_0_5' as const;
    case 1:
      return 'welcomeScreen.monthlyWeightPlans.lose_1' as const;
    case 2:
      return 'welcomeScreen.monthlyWeightPlans.lose_2' as const;
    default:
      return 'welcomeScreen.monthlyWeightPlans.0' as const;
  }
}

function getActivityDisplayLevel(level: ActivityLevel): ActivityTileLevel {
  if (level === 'very_active') {
    return 'active';
  }

  return level;
}

function getActivityIconName(level: ActivityTileLevel) {
  switch (level) {
    case 'sedentary':
      return 'person-outline';
    case 'light':
      return 'walk-outline';
    case 'moderate':
      return 'fitness-outline';
    case 'active':
      return 'flame-outline';
  }
}

function isPositiveNumber(value: string) {
  const parsedValue = Number(value);
  return !Number.isNaN(parsedValue) && parsedValue > 0;
}

function validateRequiredPositive(value: string, requiredMessage: string, positiveMessage: string) {
  if (value.trim().length === 0) {
    return requiredMessage;
  }

  return isPositiveNumber(value) || positiveMessage;
}

function buildProfileSummary(form: ProfileFormState): ProfileSummaryState | null {
  if (
    !isPositiveNumber(form.age) ||
    !isPositiveNumber(form.height) ||
    !isPositiveNumber(form.weight)
  ) {
    return null;
  }

  const profileInput = {
    gender: form.gender,
    age: Number(form.age),
    heightCm: Number(form.height),
    weightKg: Number(form.weight),
    monthlyWeightGoalKg: form.monthlyWeightGoalKg,
    activityLevel: form.activityLevel,
  };
  const bmi = Number(calculateBmi(profileInput.heightCm, profileInput.weightKg).toFixed(1));
  const maintenanceCalories = calculateMaintenanceCalorieTarget(profileInput);
  const targetCalories = calculateDailyCalorieTarget(profileInput);
  const { proteinTargetGrams, carbsTargetGrams, fatTargetGrams } =
    calculateMacroTargets(profileInput);

  return {
    bmi,
    maintenanceCalories,
    targetCalories,
    proteinGrams: proteinTargetGrams,
    carbsGrams: carbsTargetGrams,
    fatGrams: fatTargetGrams,
  };
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormState>({
    defaultValues: DEFAULT_FORM,
  });

  const selectedGender = watch('gender');
  const selectedActivityLevel = watch('activityLevel');
  const displayedActivityLevel = getActivityDisplayLevel(selectedActivityLevel);
  const selectedMonthlyWeightGoalKg = watch('monthlyWeightGoalKg');
  const ageValue = watch('age');
  const heightValue = watch('height');
  const weightValue = watch('weight');
  const debouncedProfileForm = useDebouncedValue(
    {
      gender: selectedGender,
      age: ageValue,
      height: heightValue,
      weight: weightValue,
      monthlyWeightGoalKg: selectedMonthlyWeightGoalKg,
      activityLevel: selectedActivityLevel,
    },
    250
  );
  const profileSummary = useMemo(
    () => buildProfileSummary(debouncedProfileForm),
    [debouncedProfileForm]
  );

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    const profile = await getUserProfile();

    if (!profile) {
      reset(DEFAULT_FORM);
      setIsLoading(false);
      return;
    }

    reset({
      gender: profile.gender,
      age: String(profile.age),
      height: String(profile.heightCm),
      weight: String(profile.weightKg),
      monthlyWeightGoalKg: profile.monthlyWeightGoalKg,
      activityLevel: profile.activityLevel,
    });
    setIsLoading(false);
  }, [reset]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const onSubmit = async (form: ProfileFormState) => {
    setIsSaving(true);

    const profile = await upsertUserProfile({
      gender: form.gender,
      age: Number(form.age),
      heightCm: Number(form.height),
      weightKg: Number(form.weight),
      monthlyWeightGoalKg: form.monthlyWeightGoalKg,
      activityLevel: form.activityLevel,
    });

    if (profile) {
      await syncActiveGoalToProfile(profile);
    }

    setIsSaving(false);
    router.replace('/(main)/(tabs)');
  };

  if (isLoading) {
    return (
      <ScreenContainer padded edges={['bottom']}>
        <Text>{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={[]}>
      <View style={styles.layout}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={theme.metrics.spacingV.p24}
        >
          <View style={styles.screen}>
            <Card variant="elevated" style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text variant="h2">{t('welcomeScreen.formTitle')}</Text>
                <Text variant="bodySmall" color="secondary">
                  {t('welcomeScreen.formSubtitle')}
                </Text>
              </View>

              <View style={styles.optionGroup}>
                <Text variant="label">{t('welcomeScreen.fields.gender')}</Text>
                <View style={styles.optionRow}>
                  {GENDER_KEYS.map((gender) => {
                    const isActive = selectedGender === gender;

                    return (
                      <Pressable
                        key={gender}
                        accessibilityRole="button"
                        accessibilityLabel={t(`welcomeScreen.genderOptions.${gender}`)}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() => setValue('gender', gender, { shouldValidate: true })}
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={isActive ? 'onBrand' : 'secondary'}
                        >
                          {t(`welcomeScreen.genderOptions.${gender}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Controller
                control={control}
                name="age"
                rules={{
                  required: t('validation.required'),
                  validate: (value) =>
                    validateRequiredPositive(
                      value,
                      t('validation.required'),
                      t('welcomeScreen.validation.positive')
                    ),
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('welcomeScreen.fields.age')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    error={errors.age?.message}
                    placeholder={t('welcomeScreen.placeholders.age')}
                  />
                )}
              />

              <View style={styles.measurementRow}>
                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="height"
                    rules={{
                      required: t('validation.required'),
                      validate: (value) =>
                        validateRequiredPositive(
                          value,
                          t('validation.required'),
                          t('welcomeScreen.validation.positive')
                        ),
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('welcomeScreen.fields.height')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        error={errors.height?.message}
                        placeholder={t('welcomeScreen.placeholders.height')}
                      />
                    )}
                  />
                </View>
                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="weight"
                    rules={{
                      required: t('validation.required'),
                      validate: (value) =>
                        validateRequiredPositive(
                          value,
                          t('validation.required'),
                          t('welcomeScreen.validation.positive')
                        ),
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('welcomeScreen.fields.weight')}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="number-pad"
                        error={errors.weight?.message}
                        placeholder={t('welcomeScreen.placeholders.weight')}
                      />
                    )}
                  />
                </View>
              </View>

              <View style={styles.optionGroup}>
                <Text variant="label">{t('welcomeScreen.fields.monthlyWeightPlan')}</Text>
                <View style={styles.optionWrap}>
                  {MONTHLY_WEIGHT_GOAL_OPTIONS.map((option) => {
                    const isActive = selectedMonthlyWeightGoalKg === option;
                    const optionKey = getMonthlyWeightGoalPlanKey(option);

                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={t(optionKey)}
                        style={[styles.optionPill, isActive && styles.optionPillActive]}
                        onPress={() =>
                          setValue('monthlyWeightGoalKg', option, { shouldValidate: true })
                        }
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={isActive ? 'onBrand' : 'secondary'}
                        >
                          {t(optionKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityHeaderTitle}>
                    <View style={styles.activityHeaderIcon}>
                      <Icon name="walk-outline" size={18} variant="primary" />
                    </View>
                    <Text variant="body" weight="semibold">
                      {t('welcomeScreen.fields.activityLevel')}
                    </Text>
                  </View>
                </View>

                <View style={styles.activityGrid}>
                  {ACTIVITY_TILE_LEVELS.map((activityLevel) => {
                    const isActive = displayedActivityLevel === activityLevel;

                    return (
                      <Pressable
                        key={activityLevel}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={t(`welcomeScreen.activityLevels.${activityLevel}`)}
                        style={[styles.activityTile, isActive && styles.activityTileActive]}
                        onPress={() =>
                          setValue('activityLevel', activityLevel, { shouldValidate: true })
                        }
                      >
                        <View
                          style={[
                            styles.activityTileIcon,
                            isActive && styles.activityTileIconActive,
                          ]}
                        >
                          <Icon
                            name={getActivityIconName(activityLevel)}
                            size={18}
                            variant={isActive ? 'primary' : 'secondary'}
                          />
                        </View>
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={isActive ? 'primary' : 'secondary'}
                          align="center"
                        >
                          {t(`welcomeScreen.activityLevels.${activityLevel}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.activityDetail}>
                  <View style={styles.activityDetailIcon}>
                    <Icon
                      name={getActivityIconName(displayedActivityLevel)}
                      size={18}
                      variant="primary"
                    />
                  </View>
                  <View style={styles.activityDetailCopy}>
                    <Text variant="bodySmall" weight="semibold" color="primary">
                      {t(`welcomeScreen.activityLevels.${displayedActivityLevel}`)}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {t(`profileScreen.activityDescriptions.${displayedActivityLevel}`)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {profileSummary ? (
              <Card variant="filled" style={styles.summaryCard}>
                <Text variant="body" weight="bold">
                  {t('welcomeScreen.summaryTitle')}
                </Text>
                <View style={styles.summaryList}>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`BMI: ${profileSummary.bmi.toFixed(1)}`}
                    </Text>
                  </View>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${t('profileScreen.metrics.maintenanceCalories')}: ${profileSummary.maintenanceCalories} ${t('common.units.kcal')} / ${t('common.units.day')}`}
                    </Text>
                  </View>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${t('profileScreen.metrics.targetCalories')}: ${profileSummary.targetCalories} ${t('common.units.kcal')} / ${t('common.units.day')}`}
                    </Text>
                  </View>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${t('profileScreen.metrics.proteinTarget')}: ${profileSummary.proteinGrams}${t('common.units.gram')} / ${t('common.units.day')}`}
                    </Text>
                  </View>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${t('profileScreen.metrics.carbsTarget')}: ${profileSummary.carbsGrams}${t('common.units.gram')} / ${t('common.units.day')}`}
                    </Text>
                  </View>
                  <View style={styles.summaryListItem}>
                    <Text variant="bodySmall" color="secondary">
                      -
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${t('profileScreen.metrics.fatTarget')}: ${profileSummary.fatGrams}${t('common.units.gram')} / ${t('common.units.day')}`}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView
          enabled
          offset={{
            closed: 0,
            opened: theme.metrics.spacingV.p32,
          }}
          style={styles.footerSticky}
        >
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + theme.metrics.spacingV.p16,
              },
            ]}
          >
            <View style={styles.actions}>
              <Button
                title={t('welcomeScreen.saveAction')}
                fullWidth
                loading={isSaving}
                onPress={() => {
                  void handleSubmit(onSubmit)();
                }}
              />
            </View>
          </View>
        </KeyboardStickyView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  layout: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p120,
  },
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  formCard: {
    gap: theme.metrics.spacingV.p16,
  },
  formHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  optionGroup: {
    gap: theme.metrics.spacingV.p8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  measurementField: {
    flex: 1,
  },
  optionPill: {
    minWidth: '30%',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  optionPillActive: {
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1,
    borderColor: theme.colors.brand.primary,
  },
  activityCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  activityHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  activityHeaderIcon: {
    width: theme.metrics.spacing.p28,
    height: theme.metrics.spacing.p28,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  activityTile: {
    flex: 1,
    minHeight: theme.metrics.spacing.p64,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.background.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  activityTileActive: {
    backgroundColor: theme.colors.state.successBg,
    borderColor: theme.colors.brand.primary,
  },
  activityTileIcon: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  activityTileIconActive: {
    backgroundColor: theme.colors.background.surface,
  },
  activityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.state.successBg,
  },
  activityDetailIcon: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  activityDetailCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  summaryCard: {
    gap: vs(6),
    backgroundColor: theme.colors.background.section,
  },
  summaryList: {
    gap: theme.metrics.spacingV.p8,
  },
  summaryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  footerSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: theme.colors.background.app,
  },
  footer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.app,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  actions: {
    gap: theme.metrics.spacingV.p12,
  },
}));

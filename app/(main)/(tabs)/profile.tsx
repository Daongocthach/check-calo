import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, Icon, Input, ScreenContainer, Text } from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { GENDER_KEYS, MONTHLY_WEIGHT_GOAL_OPTIONS } from '@/features/nutrition/constants';
import { syncActiveGoalToProfile } from '@/features/nutrition/services/goalTrackingService';
import { getUserProfile, upsertUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { ActivityLevel, Gender } from '@/features/nutrition/types';
import { vs } from '@/theme/metrics';
import { toast } from '@/utils/toast';

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

const ACTIVITY_LEVEL_ORDER: Array<ActivityLevel> = ['sedentary', 'light', 'moderate', 'active'];

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

function getActivityDescriptionKey(activityLevel: ActivityLevel) {
  switch (activityLevel) {
    case 'sedentary':
      return 'profileScreen.activityDescriptions.sedentary' as const;
    case 'light':
      return 'profileScreen.activityDescriptions.light' as const;
    case 'moderate':
      return 'profileScreen.activityDescriptions.moderate' as const;
    case 'active':
    case 'very_active':
      return 'profileScreen.activityDescriptions.active' as const;
    default:
      return 'profileScreen.activityDescriptions.moderate' as const;
  }
}

function normalizeActivityLevel(activityLevel: ActivityLevel) {
  if (activityLevel === 'very_active') {
    return 'active';
  }

  return activityLevel;
}

function getGenderIconName(gender: Gender) {
  switch (gender) {
    case 'male':
      return 'male-outline' as const;
    case 'female':
      return 'female-outline' as const;
    default:
      return 'person-outline' as const;
  }
}

function getActivityIconName(activityLevel: ActivityLevel) {
  switch (activityLevel) {
    case 'sedentary':
      return 'bed-outline' as const;
    case 'light':
      return 'walk-outline' as const;
    case 'moderate':
      return 'fitness-outline' as const;
    default:
      return 'flame-outline' as const;
  }
}

function isPositiveNumber(value: string) {
  const parsedValue = Number(value);
  return !Number.isNaN(parsedValue) && parsedValue > 0;
}

export default function ProfileTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
  const selectedMonthlyWeightGoalKg = watch('monthlyWeightGoalKg');

  const currentActivityDescription = useMemo(
    () => t(getActivityDescriptionKey(selectedActivityLevel)),
    [selectedActivityLevel, t]
  );

  const loadProfile = useCallback(async () => {
    setIsLoading(true);

    try {
      const profile = await getUserProfile();

      if (!profile) {
        reset(DEFAULT_FORM);
        return;
      }

      reset({
        gender: profile.gender,
        age: String(profile.age),
        height: String(profile.heightCm),
        weight: String(profile.weightKg),
        monthlyWeightGoalKg: profile.monthlyWeightGoalKg,
        activityLevel: normalizeActivityLevel(profile.activityLevel),
      });
    } catch {
      toast.error(t('profileScreen.actionError'));
    } finally {
      setIsLoading(false);
    }
  }, [reset, t]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    if (selectedActivityLevel === 'very_active') {
      setValue('activityLevel', 'active', { shouldValidate: true });
    }
  }, [selectedActivityLevel, setValue]);

  const handleSave = useCallback(
    async (form: ProfileFormState) => {
      setIsSaving(true);

      try {
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

        toast.success(t('profileScreen.saveSuccess'));
        router.replace('/(main)/(tabs)');
      } catch {
        toast.error(t('profileScreen.actionError'));
      } finally {
        setIsSaving(false);
      }
    },
    [router, t]
  );

  if (isLoading) {
    return (
      <ScreenContainer padded={false} edges={['top']}>
        <View style={styles.loadingState}>
          <Text variant="body" color="secondary">
            {t('common.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['top']}>
      <View style={styles.layout}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.backButton}
            onPress={() => router.replace('/(main)/(tabs)')}
          >
            <Icon name="chevron-back-outline" size={28} variant="primary" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text variant="h2">{t('profileScreen.title')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('profileScreen.subtitle')}
            </Text>
          </View>
        </View>

        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + theme.metrics.spacingV.p120,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={theme.metrics.spacingV.p24}
        >
          <View style={styles.screen}>
            <Card variant="elevated" style={styles.sectionCard}>
              <SectionHeader
                icon="person-outline"
                title={t('profileScreen.basicInfoTitle')}
                iconColor={theme.colors.brand.primary}
              />

              <View style={styles.fieldGroup}>
                <Text variant="body" weight="medium">
                  {t('welcomeScreen.fields.gender')}
                </Text>
                <View style={styles.genderRow}>
                  {GENDER_KEYS.map((gender) => {
                    const isActive = selectedGender === gender;

                    return (
                      <Pressable
                        key={gender}
                        accessibilityRole="button"
                        accessibilityLabel={t(`welcomeScreen.genderOptions.${gender}`)}
                        accessibilityState={{ selected: isActive }}
                        style={[styles.genderPill, isActive && styles.genderPillActive]}
                        onPress={() => setValue('gender', gender, { shouldValidate: true })}
                      >
                        <Icon
                          name={getGenderIconName(gender)}
                          size={18}
                          color={
                            isActive ? theme.colors.brand.onBrand : theme.colors.icon.secondary
                          }
                        />
                        <Text
                          variant="body"
                          weight="medium"
                          color={isActive ? 'inverse' : 'secondary'}
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
                  validate: (value) =>
                    isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
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
                    rightIcon={
                      <Text variant="bodySmall" color="secondary">
                        {t('common.units.day')}
                      </Text>
                    }
                  />
                )}
              />

              <View style={styles.measurementRow}>
                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="height"
                    rules={{
                      validate: (value) =>
                        isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
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
                        rightIcon={
                          <Text variant="bodySmall" color="secondary">
                            {t('common.units.cm')}
                          </Text>
                        }
                      />
                    )}
                  />
                </View>

                <View style={styles.measurementField}>
                  <Controller
                    control={control}
                    name="weight"
                    rules={{
                      validate: (value) =>
                        isPositiveNumber(value) || t('welcomeScreen.validation.positive'),
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
                        rightIcon={
                          <Text variant="bodySmall" color="secondary">
                            {t('common.units.kg')}
                          </Text>
                        }
                      />
                    )}
                  />
                </View>
              </View>
            </Card>

            <Card variant="elevated" style={styles.sectionCard}>
              <SectionHeader
                icon="speedometer-outline"
                title={t('profileScreen.weightPlanTitle')}
                iconColor={theme.colors.brand.primary}
              />

              <View style={styles.planWrap}>
                {MONTHLY_WEIGHT_GOAL_OPTIONS.map((option) => {
                  const isActive = selectedMonthlyWeightGoalKg === option;

                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={t(getMonthlyWeightGoalPlanKey(option))}
                      style={[styles.planPill, isActive && styles.planPillActive]}
                      onPress={() =>
                        setValue('monthlyWeightGoalKg', option, { shouldValidate: true })
                      }
                    >
                      <Text
                        variant="bodySmall"
                        weight="medium"
                        color={isActive ? 'inverse' : 'secondary'}
                        align="center"
                      >
                        {t(getMonthlyWeightGoalPlanKey(option))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card variant="elevated" style={styles.sectionCard}>
              <SectionHeader
                icon="walk-outline"
                title={t('profileScreen.activityTitle')}
                iconColor={theme.colors.brand.primary}
              />

              <View style={styles.activityGrid}>
                {ACTIVITY_LEVEL_ORDER.map((activityLevel) => {
                  const isActive = selectedActivityLevel === activityLevel;

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
                      <Icon
                        name={getActivityIconName(activityLevel)}
                        size={22}
                        color={isActive ? theme.colors.brand.primary : theme.colors.icon.secondary}
                      />
                      <Text
                        variant="bodySmall"
                        weight="medium"
                        align="center"
                        color={isActive ? 'primary' : 'secondary'}
                      >
                        {t(`welcomeScreen.activityLevels.${activityLevel}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.activitySummary}>
                <View style={styles.activitySummaryIcon}>
                  <Icon name="walk-outline" size={18} color={theme.colors.brand.primary} />
                </View>
                <View style={styles.activitySummaryCopy}>
                  <Text variant="body" weight="semibold" color="primary">
                    {t(`welcomeScreen.activityLevels.${selectedActivityLevel}`)}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {currentActivityDescription}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </KeyboardAwareScrollView>

        <KeyboardStickyView enabled offset={{ closed: 0, opened: 0 }} style={styles.footerSticky}>
          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + theme.metrics.spacingV.p12,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profileScreen.saveAndStart')}
              accessibilityState={{ busy: isSaving, disabled: isSaving }}
              disabled={isSaving}
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={() => {
                void handleSubmit(handleSave)();
              }}
            >
              <Text variant="body" weight="semibold" color="inverse">
                {t('profileScreen.saveAndStart')}
              </Text>
            </Pressable>
          </View>
        </KeyboardStickyView>
      </View>
    </ScreenContainer>
  );
}

function SectionHeader({
  icon,
  title,
  iconColor,
}: {
  icon: IconProps['name'];
  title: string;
  iconColor: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <Text variant="h3">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  layout: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.app,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p8,
  },
  backButton: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.06,
    shadowRadius: vs(8),
    elevation: theme.colors.shadow.elevationSmall,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  scrollContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
  },
  screen: {
    gap: theme.metrics.spacingV.p16,
  },
  sectionCard: {
    gap: theme.metrics.spacingV.p20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  sectionIcon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  fieldGroup: {
    gap: theme.metrics.spacingV.p8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  genderPill: {
    flex: 1,
    minHeight: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p8,
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  genderPillActive: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  measurementRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  measurementField: {
    flex: 1,
  },
  planWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  planPill: {
    width: '31%',
    minHeight: theme.metrics.spacing.p52,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  planPillActive: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  activityTile: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: '22%',
    minHeight: theme.metrics.spacing.p84,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p8,
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  activityTileActive: {
    backgroundColor: theme.colors.state.successBg,
    borderColor: theme.colors.brand.primary,
  },
  activitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.state.successBg,
  },
  activitySummaryIcon: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  activitySummaryCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
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
  submitButton: {
    minHeight: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.tertiary,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
}));

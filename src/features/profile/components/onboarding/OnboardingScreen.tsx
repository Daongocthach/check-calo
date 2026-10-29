import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';
import {
  Button,
  FormField,
  Icon,
  Input,
  Loading,
  ProgressBar,
  ScreenHeader,
  Text,
} from '@/common/components';
import { BuddyMascot } from '@/features/buddy/components/BuddyMascot';
import { useBuddyName } from '@/features/buddy/hooks/useBuddyName';
import { useFoodLogQuery } from '@/features/food-log/hooks/useFoodLogQuery';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { GoalPlanner } from '@/features/goals/components/GoalPlanner';
import { hs } from '@/theme/metrics';
import { toast } from '@/utils/toast';
import { toBodyStats, toGoalDraft, useProfileForm } from '../../hooks/useProfileForm';
import { getUserProfile } from '../../services/profileRepository';
import { getBmiCategory } from '../../utils/bmi';
import { MetricSliderCard } from './MetricSliderCard';
import { OptionPill, SectionCard } from './OnboardingParts';

const GENDERS = [
  { value: 'male', icon: 'male' },
  { value: 'female', icon: 'female' },
  { value: 'other', icon: 'male-female' },
] as const;

const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active'] as const;

const STEPS = ['about', 'goal', 'plan'] as const;

/** First run: about you, then the goal, then the plan. Saved profiles edit these elsewhere. */
export function OnboardingScreen() {
  const { t } = useTranslation();
  const { name: buddyName } = useBuddyName();
  const router = useRouter();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const { data: existingProfile, isLoading } = useFoodLogQuery('profile', getUserProfile);
  const { form, plan, submit } = useProfileForm();
  const { control, watch, setValue, trigger, formState } = form;
  const [step, setStep] = useState(0);
  const values = watch();
  const bmiCategory = getBmiCategory(plan.bmi);
  const macroPercent = (grams: number, kcalPerGram: number) =>
    plan.dailyCalories > 0 ? Math.round(((grams * kcalPerGram) / plan.dailyCalories) * 100) : 0;

  const goNext = async () => {
    if (step === 0 && !(await trigger(['displayName', 'age']))) {
      return;
    }

    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const handleSubmit = async () => {
    try {
      const saved = await submit();
      if (!saved) {
        setStep(0);
        return;
      }
      markFoodEntriesChanged();
      toast.success(t('onboarding.saveSuccess'));
      router.replace('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (existingProfile && !formState.isSubmitting && !formState.isSubmitSuccessful) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('onboarding.headerTitle')} showBack={false} />
      <View style={styles.progress}>
        <Text variant="caption" color="secondary">
          {t('onboarding.step', {
            current: step + 1,
            total: STEPS.length,
            title: t(`onboarding.steps.${STEPS[step]}`),
          })}
        </Text>
        <ProgressBar value={((step + 1) / STEPS.length) * 100} size="sm" />
      </View>
      <KeyboardAwareScrollView
        // Each step starts at the top.
        key={step}
        contentContainerStyle={styles.content}
        bottomOffset={hs(24)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroText}>
                <Text variant="h2" weight="bold">
                  {t('onboarding.title')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t('onboarding.subtitle', { name: buddyName })}
                </Text>
              </View>
              <BuddyMascot level={2} size={hs(96)} />
            </View>

            <SectionCard icon="person-outline" title={t('onboarding.basicInfo')}>
              <FormField
                control={control}
                name="displayName"
                label={t('onboarding.displayName')}
                required
              >
                <Input
                  placeholder={t('onboarding.displayNamePlaceholder')}
                  autoCapitalize="words"
                />
              </FormField>
              <FormField control={control} name="age" label={t('onboarding.age')} required>
                <Input keyboardType="number-pad" maxLength={3} />
              </FormField>
              <Text variant="label">{t('onboarding.gender')}</Text>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <View style={styles.row}>
                    {GENDERS.map((gender) => (
                      <OptionPill
                        key={gender.value}
                        icon={gender.icon}
                        label={t(`onboarding.genders.${gender.value}`)}
                        selected={field.value === gender.value}
                        onPress={() => field.onChange(gender.value)}
                      />
                    ))}
                  </View>
                )}
              />
            </SectionCard>

            <SectionCard icon="body-outline" title={t('onboarding.bodyMetrics')}>
              <View style={styles.row}>
                <Controller
                  control={control}
                  name="heightCm"
                  render={({ field }) => (
                    <MetricSliderCard
                      label={t('onboarding.height')}
                      unit={t('common.units.cm')}
                      value={field.value}
                      min={120}
                      max={220}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="weightKg"
                  render={({ field }) => (
                    <MetricSliderCard
                      label={t('onboarding.weight')}
                      unit={t('common.units.kg')}
                      value={field.value}
                      min={30}
                      max={160}
                      onChange={field.onChange}
                    />
                  )}
                />
              </View>
              <View style={[styles.bmiCard, bmiCategory !== 'normal' && styles.bmiCardWarning]}>
                <View style={styles.bmiBadge}>
                  <Text variant="caption" color="secondary">
                    {t('onboarding.bmi')}
                  </Text>
                  <Text variant="body" weight="bold">
                    {plan.bmi.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="bodySmall" weight="bold">
                    {t(`onboarding.bmiCategories.${bmiCategory}.title`)}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {t(`onboarding.bmiCategories.${bmiCategory}.description`)}
                  </Text>
                </View>
              </View>
              <Text variant="label">{t('onboarding.activity')}</Text>
              <Controller
                control={control}
                name="activityLevel"
                render={({ field }) => (
                  <View style={styles.wrapRow}>
                    {ACTIVITIES.map((level) => (
                      <View key={level} style={styles.halfItem}>
                        <OptionPill
                          label={t(`onboarding.activities.${level}`)}
                          selected={
                            field.value === level ||
                            (level === 'active' && field.value === 'very_active')
                          }
                          onPress={() => field.onChange(level)}
                        />
                      </View>
                    ))}
                  </View>
                )}
              />
            </SectionCard>
          </>
        ) : null}

        {step === 1 ? (
          <SectionCard icon="flag-outline" title={t('onboarding.goal')}>
            <GoalPlanner
              body={toBodyStats(values)}
              draft={toGoalDraft(values)}
              onChange={(draft) => {
                setValue('goalMode', draft.mode);
                setValue('targetWeightKg', draft.targetWeightKg);
                setValue('weeks', draft.weeks);
              }}
            />
          </SectionCard>
        ) : null}

        {step === 2 ? (
          <>
            <SectionCard icon="sparkles" title={t('onboarding.plan')}>
              <View style={styles.row}>
                {[
                  {
                    key: 'kcal',
                    icon: 'flame' as const,
                    value: plan.dailyCalories.toLocaleString(),
                    label: t('onboarding.planKcal'),
                    hint: t('onboarding.planKcalHint'),
                  },
                  {
                    key: 'protein',
                    icon: 'leaf-outline' as const,
                    value: `${plan.proteinGrams}g`,
                    label: t('macros.protein'),
                    hint: t('onboarding.planPercent', {
                      value: macroPercent(plan.proteinGrams, 4),
                    }),
                  },
                  {
                    key: 'fat',
                    icon: 'water-outline' as const,
                    value: `${plan.fatGrams}g`,
                    label: t('macros.fat'),
                    hint: t('onboarding.planPercent', { value: macroPercent(plan.fatGrams, 9) }),
                  },
                  {
                    key: 'carbs',
                    icon: 'nutrition' as const,
                    value: `${plan.carbsGrams}g`,
                    label: t('macros.carbs'),
                    hint: t('onboarding.planPercent', {
                      value: macroPercent(plan.carbsGrams, 4),
                    }),
                  },
                ].map((item) => (
                  <View key={item.key} style={styles.planItem}>
                    <Icon name={item.icon} variant="accent" size={18} />
                    <Text variant="body" weight="bold">
                      {item.value}
                    </Text>
                    <Text variant="caption">{item.label}</Text>
                    <Text variant="caption" color="tertiary" align="center">
                      {item.hint}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="caption" color="secondary" align="center">
                {t('onboarding.planRange', {
                  min: plan.calorieRange.min.toLocaleString(),
                  max: plan.calorieRange.max.toLocaleString(),
                })}
              </Text>
            </SectionCard>
            <Button
              title={t('onboarding.healthSources')}
              variant="ghost"
              size="sm"
              onPress={() => router.push('/health-sources')}
            />
          </>
        ) : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <View style={styles.flex}>
              <Button
                title={t('common.back')}
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => setStep((current) => current - 1)}
              />
            </View>
          ) : null}
          <View style={styles.flex}>
            {step < STEPS.length - 1 ? (
              <Button
                title={t('common.next')}
                size="lg"
                fullWidth
                onPress={() => {
                  void goNext();
                }}
              />
            ) : (
              <Button
                title={t('onboarding.startAction')}
                leftIcon={<Icon name="rocket-outline" variant="onBrand" size={18} />}
                size="lg"
                fullWidth
                loading={formState.isSubmitting}
                onPress={() => {
                  void handleSubmit();
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
  },
  progress: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p8,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  heroText: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  row: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  halfItem: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.state.successBg,
  },
  bmiCardWarning: {
    backgroundColor: theme.colors.state.warningBg,
  },
  bmiBadge: {
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  planItem: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
}));

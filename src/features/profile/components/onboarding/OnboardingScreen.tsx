import { useRouter } from 'expo-router';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native-unistyles';
import { Button, FormField, Icon, Input, Loading, ScreenHeader, Text } from '@/common/components';
import { BuddyMascot } from '@/features/buddy/components/BuddyMascot';
import { useBuddyName } from '@/features/buddy/hooks/useBuddyName';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { hs } from '@/theme/metrics';
import { toast } from '@/utils/toast';
import { getTargetWeightBounds, useProfileForm } from '../../hooks/useProfileForm';
import type { ProfileFormValues } from '../../schemas/profileSchema';
import { getBmiCategory } from '../../utils/bmi';
import { calculateBmi } from '../../utils/calorie';
import { MetricSliderCard } from './MetricSliderCard';
import { ChoiceTile, OptionPill, SectionCard } from './OnboardingParts';

const GENDERS = [
  { value: 'male', icon: 'male' },
  { value: 'female', icon: 'female' },
  { value: 'other', icon: 'male-female' },
] as const;

const GOALS = [
  { value: 'lose', icon: 'flame-outline' },
  { value: 'maintain', icon: 'scale-outline' },
  { value: 'gain', icon: 'barbell-outline' },
] as const;

const RATES: ProfileFormValues['monthlyRateKg'][] = [0.5, 1, 2];

const ACTIVITIES = ['sedentary', 'light', 'moderate', 'active'] as const;

const HEALTHY_MIN_BMI = 18.5;

function formatPlanDate(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(`${dateKey}T00:00:00`)
  );
}

export function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const { name: buddyName } = useBuddyName();
  const router = useRouter();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const { form, plan, isLoading, hasExistingProfile, submit } = useProfileForm();
  const { control, watch, formState } = form;
  const goalMode = watch('goalMode');
  const weightKg = watch('weightKg');
  const heightCm = watch('heightCm');
  const targetWeightKg = watch('targetWeightKg');
  const targetBounds = getTargetWeightBounds(goalMode, weightKg);
  const targetBelowHealthyBmi =
    goalMode === 'lose' && calculateBmi(heightCm, targetWeightKg) < HEALTHY_MIN_BMI;
  const bmiCategory = getBmiCategory(plan.bmi);
  const macroPercent = (grams: number, kcalPerGram: number) =>
    plan.dailyCalories > 0 ? Math.round(((grams * kcalPerGram) / plan.dailyCalories) * 100) : 0;

  const handleSubmit = async () => {
    try {
      const saved = await submit();
      if (!saved) {
        return;
      }
      markFoodEntriesChanged();
      toast.success(t('onboarding.saveSuccess'));
      if (hasExistingProfile && router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={hasExistingProfile ? t('onboarding.editTitle') : t('onboarding.headerTitle')}
        showBack={hasExistingProfile}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={hs(24)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <Input placeholder={t('onboarding.displayNamePlaceholder')} autoCapitalize="words" />
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
        </SectionCard>

        <SectionCard icon="flag-outline" title={t('onboarding.goal')}>
          <Controller
            control={control}
            name="goalMode"
            render={({ field }) => (
              <View style={styles.row}>
                {GOALS.map((goal) => (
                  <ChoiceTile
                    key={goal.value}
                    icon={goal.icon}
                    title={t(`onboarding.goals.${goal.value}.title`)}
                    description={t(`onboarding.goals.${goal.value}.description`)}
                    selected={field.value === goal.value}
                    onPress={() => field.onChange(goal.value)}
                  />
                ))}
              </View>
            )}
          />
          {goalMode !== 'maintain' ? (
            <>
              <Text variant="label">
                {goalMode === 'lose' ? t('onboarding.loseRate') : t('onboarding.gainRate')}
              </Text>
              <Controller
                control={control}
                name="monthlyRateKg"
                render={({ field }) => (
                  <View style={styles.row}>
                    {RATES.map((rate) => (
                      <OptionPill
                        key={rate}
                        label={t('onboarding.ratePerMonth', { value: rate })}
                        selected={field.value === rate}
                        onPress={() => field.onChange(rate)}
                      />
                    ))}
                  </View>
                )}
              />
              <Controller
                control={control}
                name="targetWeightKg"
                render={({ field }) => (
                  <View style={styles.row}>
                    <MetricSliderCard
                      label={t('onboarding.targetWeight')}
                      unit={t('common.units.kg')}
                      value={field.value}
                      min={targetBounds.min}
                      max={targetBounds.max}
                      onChange={field.onChange}
                    />
                  </View>
                )}
              />
              {plan.expectedEndDate ? (
                <Text variant="caption" color="secondary">
                  {t('onboarding.expectedDate', {
                    value: formatPlanDate(plan.expectedEndDate, i18n.language),
                  })}
                </Text>
              ) : null}
              {targetBelowHealthyBmi ? (
                <Text variant="caption" style={styles.warningText}>
                  {t('onboarding.targetBmiWarning')}
                </Text>
              ) : null}
            </>
          ) : null}
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
                hint: t('onboarding.planPercent', { value: macroPercent(plan.proteinGrams, 4) }),
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
                hint: t('onboarding.planPercent', { value: macroPercent(plan.carbsGrams, 4) }),
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
          title={hasExistingProfile ? t('onboarding.saveAction') : t('onboarding.startAction')}
          leftIcon={<Icon name="rocket-outline" variant="onBrand" size={18} />}
          size="lg"
          fullWidth
          loading={formState.isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
        />
        <Button
          title={t('onboarding.healthSources')}
          variant="ghost"
          size="sm"
          onPress={() => router.push('/health-sources')}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
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
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.state.successBg,
  },
  warningText: {
    color: theme.colors.state.warning,
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

import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, ProgressBar, Text } from '@/common/components';
import { BuddyMascot } from '@/features/buddy/components/BuddyMascot';
import type { WeightGoalMode } from '@/features/goals/types';
import {
  normalizeGoalDraft,
  planForDuration,
  type GoalDraft,
} from '@/features/goals/utils/goalPlan';
import { addDays } from '@/features/goals/utils/weightGoal';
import { hs } from '@/theme/metrics';
import { formatDateKey } from '@/utils/date';
import type { ProfilePlan } from '../../hooks/useProfileForm';
import { getBmiCategory } from '../../utils/bmi';
import { calculateBmi, calculateBmr, getActivityFactor, type BodyStats } from '../../utils/calorie';
import { SectionCard } from './OnboardingParts';

type IconName = ComponentProps<typeof Icon>['name'];

const LOADING_MS = 3000;
const LOADING_TICK_MS = 50;
const LOADING_MESSAGES = ['bmr', 'energy', 'pace', 'roadmap'] as const;
const KCAL_PER_KG = 7700;
const CHANGE_SIGN: Record<WeightGoalMode, string> = { lose: '−', gain: '+', maintain: '±' };

export interface PlanStepProps {
  body: BodyStats;
  draft: GoalDraft;
  plan: ProfilePlan;
  /** Called once the pretend calculation finishes; keep it stable (e.g. a state setter). */
  onReady: () => void;
}

/** The last onboarding step: a short "calculating" moment, then the plan and why. */
export function PlanStep({ body, draft, plan, onReady }: PlanStepProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const step = (100 * LOADING_TICK_MS) / LOADING_MS;
    const timer = setInterval(() => {
      setProgress((current) => Math.min(100, current + step));
    }, LOADING_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const done = progress >= 100;

  useEffect(() => {
    if (done) {
      onReady();
    }
  }, [done, onReady]);

  return done ? (
    <PlanResults body={body} draft={draft} plan={plan} />
  ) : (
    <PlanLoading progress={progress} />
  );
}

function PlanLoading({ progress }: { progress: number }) {
  const { t } = useTranslation();
  const message =
    LOADING_MESSAGES[Math.min(LOADING_MESSAGES.length - 1, Math.floor(progress / 25))];

  return (
    <View style={styles.loading}>
      <BuddyMascot level={2} size={hs(120)} animated />
      <Text variant="h3" weight="bold" align="center">
        {t('onboarding.planLoading.title')}
      </Text>
      <View style={styles.loadingBar}>
        <ProgressBar value={progress} accessibilityLabel={t('onboarding.planLoading.title')} />
        <Text variant="caption" color="secondary" align="center">
          {`${Math.round(progress)}%`}
        </Text>
      </View>
      <Animated.View key={message} entering={FadeIn}>
        <Text variant="bodySmall" color="secondary" align="center">
          {t(`onboarding.planLoading.${message}`)}
        </Text>
      </Animated.View>
    </View>
  );
}

function PlanResults({ body, draft, plan }: Omit<PlanStepProps, 'onReady'>) {
  const { t, i18n } = useTranslation();
  const goal = normalizeGoalDraft(body, draft);
  const duration = planForDuration(body, goal.targetWeightKg, goal.weeks);
  const mode = duration.mode;
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const rateNumber = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const format = (value: number) => number.format(value);
  const sign = CHANGE_SIGN[mode];
  const endDate = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(`${addDays(formatDateKey(new Date()), duration.weeks * 7)}T00:00:00`));

  const bmr = Math.round(calculateBmr(body));
  const activityFactor = getActivityFactor(body.activityLevel);
  const activityKey = body.activityLevel === 'very_active' ? 'active' : body.activityLevel;
  const dailyGap = Math.abs(duration.maintenanceCalories - plan.dailyCalories);
  const weeklyCalories = plan.dailyCalories * 7;
  const weeklyRate = rateNumber.format(Math.round(duration.weeklyRateKg * 100) / 100);
  const changeKg = Math.abs(goal.targetWeightKg - body.weightKg);
  const bmi = calculateBmi(body.heightCm, body.weightKg);
  const targetBmi = calculateBmi(body.heightCm, goal.targetWeightKg);
  const macroPercent = (grams: number, kcalPerGram: number) =>
    plan.dailyCalories > 0 ? Math.round(((grams * kcalPerGram) / plan.dailyCalories) * 100) : 0;
  const weeks = t('goalPlanner.weeks', { count: duration.weeks });

  const results: { key: string; icon: IconName; label: string; value: string; hint: string }[] = [
    {
      key: 'target',
      icon: 'flag-outline',
      label: t('onboarding.planResults.target'),
      value: `${format(goal.targetWeightKg)} ${t('common.units.kg')}`,
      hint:
        mode === 'maintain'
          ? t('onboarding.planResults.targetMaintain')
          : t('onboarding.planResults.targetChange', {
              value: `${sign}${format(changeKg)}`,
            }),
    },
    {
      key: 'daily',
      icon: 'flame',
      label: t('onboarding.planResults.daily'),
      value: format(plan.dailyCalories),
      hint: t('onboarding.planResults.dailyHint', {
        min: format(plan.calorieRange.min),
        max: format(plan.calorieRange.max),
      }),
    },
    {
      key: 'weekly',
      icon: 'calendar-outline',
      label: t('onboarding.planResults.weekly'),
      value: format(weeklyCalories),
      hint:
        mode === 'maintain'
          ? t('onboarding.planResults.weeklyMaintain')
          : t('onboarding.planResults.weeklyHint', { value: `${sign}${weeklyRate}` }),
    },
    {
      key: 'date',
      icon: 'trophy-outline',
      label: t('onboarding.planResults.date'),
      value: mode === 'maintain' ? t('onboarding.planResults.dateMaintain') : endDate,
      hint:
        mode === 'maintain'
          ? t('onboarding.planResults.dateMaintainHint')
          : t('onboarding.planResults.dateHint', { weeks }),
    },
  ];

  const adjustment = {
    lose: t('onboarding.planExplain.dailyLose', {
      gap: format(dailyGap),
      kcal: format(plan.dailyCalories),
    }),
    gain: t('onboarding.planExplain.dailyGain', {
      gap: format(dailyGap),
      kcal: format(plan.dailyCalories),
    }),
    maintain: t('onboarding.planExplain.dailyMaintain'),
  }[mode];

  const explanations: { key: string; icon: IconName; title: string; body: string[] }[] = [
    {
      key: 'daily',
      icon: 'flame-outline',
      title: t('onboarding.planExplain.dailyTitle'),
      body: [
        t('onboarding.planExplain.dailyBmr', { bmr: format(bmr) }),
        t('onboarding.planExplain.dailyTdee', {
          activity: t(`onboarding.activities.${activityKey}`).toLowerCase(),
          factor: rateNumber.format(activityFactor),
          tdee: format(duration.maintenanceCalories),
        }),
        adjustment,
        t('onboarding.planRange', {
          min: format(plan.calorieRange.min),
          max: format(plan.calorieRange.max),
        }),
      ],
    },
    {
      key: 'weekly',
      icon: 'calendar-outline',
      title: t('onboarding.planExplain.weeklyTitle'),
      body: [
        t('onboarding.planExplain.weeklyTotal', {
          kcal: format(plan.dailyCalories),
          total: format(weeklyCalories),
        }),
        mode === 'maintain'
          ? t('onboarding.planExplain.weeklyMaintain')
          : t(`onboarding.planExplain.weekly${mode === 'lose' ? 'Lose' : 'Gain'}`, {
              gap: format(dailyGap * 7),
              perKg: format(KCAL_PER_KG),
              rate: weeklyRate,
              pace: t(`goalPlanner.pace.${duration.pace}`).toLowerCase(),
            }),
        t('onboarding.planExplain.weeklyFlex'),
      ],
    },
    {
      key: 'target',
      icon: 'body-outline',
      title: t('onboarding.planExplain.targetTitle'),
      body: [
        t('onboarding.planExplain.targetNow', {
          weight: format(body.weightKg),
          bmi: format(bmi),
          category: t(`onboarding.bmiCategories.${getBmiCategory(bmi)}.title`).toLowerCase(),
        }),
        mode === 'maintain'
          ? t('onboarding.planExplain.targetMaintain')
          : t('onboarding.planExplain.targetThen', {
              weight: format(goal.targetWeightKg),
              bmi: format(targetBmi),
              category: t(
                `onboarding.bmiCategories.${getBmiCategory(targetBmi)}.title`
              ).toLowerCase(),
            }),
        t('onboarding.planExplain.targetHealthy'),
      ],
    },
    {
      key: 'date',
      icon: 'trophy-outline',
      title: t('onboarding.planExplain.dateTitle'),
      body: [
        mode === 'maintain'
          ? t('onboarding.planExplain.dateMaintain')
          : t('onboarding.planExplain.dateMath', {
              change: format(changeKg),
              rate: weeklyRate,
              weeks,
              date: endDate,
            }),
        t('onboarding.planExplain.dateEstimate'),
      ],
    },
    {
      key: 'macros',
      icon: 'nutrition-outline',
      title: t('onboarding.planExplain.macrosTitle'),
      body: [
        t('onboarding.planExplain.macrosSplit', {
          protein: plan.proteinGrams,
          proteinPercent: macroPercent(plan.proteinGrams, 4),
          fat: plan.fatGrams,
          fatPercent: macroPercent(plan.fatGrams, 9),
          carbs: plan.carbsGrams,
          carbsPercent: macroPercent(plan.carbsGrams, 4),
        }),
        t('onboarding.planExplain.macrosWhy'),
      ],
    },
  ];

  return (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <SectionCard icon="sparkles" title={t('onboarding.plan')}>
          <View style={styles.grid}>
            {results.map((item) => (
              <View key={item.key} style={styles.resultItem}>
                <View style={styles.resultLabel}>
                  <Icon name={item.icon} variant="accent" size={16} />
                  <Text variant="caption" color="secondary">
                    {item.label}
                  </Text>
                </View>
                <Text variant="h3" weight="bold">
                  {item.value}
                </Text>
                <Text variant="caption" color="tertiary">
                  {item.hint}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <SectionCard icon="information-circle-outline" title={t('onboarding.planExplain.title')}>
          {explanations.map((item) => (
            <View key={item.key} style={styles.explainItem}>
              <View style={styles.resultLabel}>
                <Icon name={item.icon} variant="brand" size={16} />
                <Text variant="bodySmall" weight="bold">
                  {item.title}
                </Text>
              </View>
              {item.body.map((line) => (
                <Text key={line} variant="bodySmall" color="secondary">
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </SectionCard>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  loading: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p16,
    paddingVertical: theme.metrics.spacingV.p32,
  },
  loadingBar: {
    alignSelf: 'stretch',
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  resultItem: {
    width: '48%',
    flexGrow: 1,
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  resultLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  explainItem: {
    gap: theme.metrics.spacingV.p4,
    paddingTop: theme.metrics.spacingV.p8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.subtle,
  },
}));

import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import { ProgressBar, Text } from '@/common/components';
import { BuddyMascot } from '@/features/buddy/components/BuddyMascot';
import {
  normalizeGoalDraft,
  planForDuration,
  type GoalDraft,
} from '@/features/goals/utils/goalPlan';
import { addDays } from '@/features/goals/utils/weightGoal';
import { hs } from '@/theme/metrics';
import { formatDateKey } from '@/utils/date';
import type { ProfilePlan } from '../../hooks/useProfileForm';
import { calculateBmi, type BodyStats } from '../../utils/calorie';
import { BmiCard } from './BmiCard';
import { PlanNutrition } from './PlanNutrition';

const LOADING_MS = 1500;
const LOADING_TICK_MS = 50;
const LOADING_MESSAGES = ['bmr', 'energy', 'pace', 'roadmap'] as const;

export interface PlanStepProps {
  body: BodyStats;
  draft: GoalDraft;
  plan: ProfilePlan;
  /** Set once the BMI card has scaled in, so it does so only once. */
  bmiAnimationPlayed: RefObject<boolean>;
  /** Called once the pretend calculation finishes; keep it stable (e.g. a state setter). */
  onReady: () => void;
}

/** The last onboarding step: a short "calculating" moment, then BMI, the inputs, the plan and why. */
export function PlanStep({ body, draft, plan, bmiAnimationPlayed, onReady }: PlanStepProps) {
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
    <PlanResults body={body} draft={draft} plan={plan} bmiAnimationPlayed={bmiAnimationPlayed} />
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

function PlanResults({ body, draft, plan, bmiAnimationPlayed }: Omit<PlanStepProps, 'onReady'>) {
  const { t, i18n } = useTranslation();
  const goal = normalizeGoalDraft(body, draft);
  const duration = planForDuration(body, goal.targetWeightKg, goal.weeks);
  const mode = duration.mode;
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const format = (value: number) => number.format(value);
  const endDate = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(`${addDays(formatDateKey(new Date()), duration.weeks * 7)}T00:00:00`));

  const activityKey = body.activityLevel === 'very_active' ? 'active' : body.activityLevel;
  const dailyGap = Math.abs(duration.maintenanceCalories - plan.dailyCalories);
  const bmi = calculateBmi(body.heightCm, body.weightKg);
  const inputs = [
    [
      { label: t('onboarding.age'), value: format(body.age) },
      { label: t('onboarding.gender'), value: t(`onboarding.genders.${body.gender}`) },
      { label: t('onboarding.activity'), value: t(`onboarding.activities.${activityKey}`) },
    ],
    [
      { label: t('onboarding.height'), value: `${format(body.heightCm)} ${t('common.units.cm')}` },
      {
        label: t('onboarding.weightAndTarget'),
        value: format(body.weightKg),
        secondaryValue: ` / ${format(goal.targetWeightKg)} ${t('common.units.kg')}`,
      },
      { label: t('onboarding.goalLabel'), value: t(`onboarding.goals.${mode}.title`) },
    ],
  ];

  return (
    <>
      <BmiCard bmi={bmi} stats={inputs} animationPlayed={bmiAnimationPlayed} />

      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.planCard}>
          <Text variant="body" weight="bold">
            {t('onboarding.plan')}
          </Text>
          <PlanNutrition plan={plan} maintenanceCalories={duration.maintenanceCalories} />
          <View style={styles.planDetails}>
            <View style={styles.detailColumn}>
              <Text variant="caption" color="secondary">
                {t(`onboarding.calorieAdjustment.${mode}`)}
              </Text>
              <Text variant="bodySmall" style={styles.detailValue}>
                {format(dailyGap)} {t('onboarding.planResults.daily')}
              </Text>
            </View>
            <View style={[styles.detailColumn, styles.detailRight]}>
              <Text variant="caption" color="secondary" align="right">
                {t('onboarding.planResults.date')}
              </Text>
              <Text variant="bodySmall" align="right" style={styles.detailValue}>
                {mode === 'maintain' ? t('onboarding.planResults.dateMaintain') : endDate}
              </Text>
            </View>
          </View>
        </View>
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
  planCard: {
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  planDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
  },
  detailColumn: { flex: 1, minWidth: 0, gap: theme.metrics.spacingV.p4 },
  detailRight: { alignItems: 'flex-end' },
  detailValue: { fontStyle: 'italic' },
}));

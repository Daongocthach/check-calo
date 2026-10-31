import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Slider, Text } from '@/common/components';
import { calculateBmi, type BodyStats } from '@/features/profile/utils/calorie';
import { formatDateKey } from '@/utils/date';
import type { WeightGoalMode } from '../../types';
import {
  getGoalDurationBounds,
  getTargetWeightBounds,
  normalizeGoalDraft,
  planForDuration,
  TARGET_WEIGHT_LIMITS,
  type GoalDraft,
} from '../../utils/goalPlan';
import { addDays } from '../../utils/weightGoal';
import { ChoiceTile } from './ChoiceTile';
import { MetricSliderCard } from './MetricSliderCard';

const MODES = [
  { value: 'lose', icon: 'flame-outline' },
  { value: 'maintain', icon: 'scale-outline' },
  { value: 'gain', icon: 'barbell-outline' },
] as const;

const HEALTHY_MIN_BMI = 18.5;
const WEEKS_PER_MONTH = 30 / 7;

export interface GoalPlannerProps {
  /** Body stats the plan is sized for; the weight is where the goal starts. */
  body: BodyStats;
  draft: GoalDraft;
  onChange: (draft: GoalDraft) => void;
}

/** Picks the direction, target weight and duration, and previews the daily calories. */
export function GoalPlanner({ body, draft, onChange }: GoalPlannerProps) {
  const { t, i18n } = useTranslation();
  const current = normalizeGoalDraft(body, draft);
  const plan = planForDuration(body, current.targetWeightKg, current.weeks);
  const numberFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const kcal = numberFormat.format(plan.dailyCalories);

  const changeMode = (mode: WeightGoalMode) => {
    onChange(normalizeGoalDraft(body, { ...current, mode, weeks: 0 }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {MODES.map((mode) => (
          <ChoiceTile
            key={mode.value}
            icon={mode.icon}
            title={t(`onboarding.goals.${mode.value}.title`)}
            description={t(`onboarding.goals.${mode.value}.description`)}
            selected={current.mode === mode.value}
            onPress={() => changeMode(mode.value)}
          />
        ))}
      </View>

      {current.mode === 'maintain' ? (
        <Text variant="bodySmall" color="secondary">
          {t('goalPlanner.maintainHint', { kcal })}
        </Text>
      ) : (
        <DurationFields body={body} draft={current} onChange={onChange} />
      )}
    </View>
  );
}

function DurationFields({ body, draft, onChange }: GoalPlannerProps) {
  const { t, i18n } = useTranslation();
  const targetBounds = getTargetWeightBounds(body, draft.mode);
  const durationBounds = getGoalDurationBounds(body, draft.targetWeightKg);
  const plan = planForDuration(body, draft.targetWeightKg, draft.weeks);
  const numberFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const rateFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const endDate = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(`${addDays(formatDateKey(new Date()), draft.weeks * 7)}T00:00:00`));
  // The furthest target a year allows: further changes go in stages.
  const atReachLimit =
    draft.mode === 'lose'
      ? draft.targetWeightKg === targetBounds.min && targetBounds.min > TARGET_WEIGHT_LIMITS.min
      : draft.targetWeightKg === targetBounds.max && targetBounds.max < TARGET_WEIGHT_LIMITS.max;
  const targetBelowHealthyBmi =
    draft.mode === 'lose' && calculateBmi(body.heightCm, draft.targetWeightKg) < HEALTHY_MIN_BMI;
  const metrics = [
    { key: 'kcal', value: numberFormat.format(plan.dailyCalories), label: t('goalPlanner.kcal') },
    {
      key: 'rate',
      value: rateFormat.format(Math.round(plan.weeklyRateKg * 100) / 100),
      label: t('goalPlanner.ratePerWeek'),
    },
    { key: 'pace', value: t(`goalPlanner.pace.${plan.pace}`), label: t('goalPlanner.paceLabel') },
  ];

  return (
    <>
      <View style={styles.row}>
        <MetricSliderCard
          label={t('onboarding.targetWeight')}
          unit={t('common.units.kg')}
          value={draft.targetWeightKg}
          min={targetBounds.min}
          max={targetBounds.max}
          onChange={(targetWeightKg) =>
            onChange(normalizeGoalDraft(body, { ...draft, targetWeightKg }))
          }
        />
      </View>

      <View style={styles.durationCard}>
        <Text variant="caption" color="secondary">
          {t('goalPlanner.duration')}
        </Text>
        <View style={styles.valueRow}>
          <Text variant="h2" weight="bold">
            {t('goalPlanner.weeks', { count: draft.weeks })}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {t('goalPlanner.months', {
              value: numberFormat.format(Math.round((draft.weeks / WEEKS_PER_MONTH) * 10) / 10),
            })}
          </Text>
        </View>
        {durationBounds.maxWeeks > durationBounds.minWeeks ? (
          <>
            <Slider
              value={draft.weeks}
              minimumValue={durationBounds.minWeeks}
              maximumValue={durationBounds.maxWeeks}
              onValueChange={(weeks) => onChange({ ...draft, weeks })}
              accessibilityLabel={t('goalPlanner.duration')}
            />
            <View style={styles.boundsRow}>
              <Text variant="caption" color="tertiary">
                {t('goalPlanner.fastest', { count: durationBounds.minWeeks })}
              </Text>
              <Text variant="caption" color="tertiary">
                {t('goalPlanner.slowest', { count: durationBounds.maxWeeks })}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.row}>
        {metrics.map((metric) => (
          <View key={metric.key} style={styles.metric}>
            <Text variant="body" weight="bold" align="center">
              {metric.value}
            </Text>
            <Text variant="caption" color="secondary" align="center">
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="caption" color="secondary">
        {t('goalPlanner.endDate', { value: endDate })}
      </Text>
      {atReachLimit ? (
        <Text variant="caption" color="secondary">
          {t('goalPlanner.stageHint')}
        </Text>
      ) : null}
      {targetBelowHealthyBmi ? (
        <Text variant="caption" style={styles.warningText}>
          {t('onboarding.targetBmiWarning')}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  row: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  durationCard: {
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
    gap: theme.metrics.spacingV.p4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  boundsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  warningText: {
    color: theme.colors.state.warning,
  },
}));

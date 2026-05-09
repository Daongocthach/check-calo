import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, GiftedCircularProgress, Text } from '@/common/components';
import type { DailyNutritionSummary, GoalTrackingSnapshot } from '@/features/nutrition/types';
import {
  formatWeightGoalTitle,
  getGoalCycleDayProgress,
} from '@/features/nutrition/utils/goalTracking';
import GoalArrowImage from '../../../../../assets/goal-arrow.png';

interface GoalTrackingCardProps {
  goalTracking: GoalTrackingSnapshot | null;
  todaySummary: DailyNutritionSummary;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatSignedNumber(value: number, locale: string, fractionDigits = 0) {
  let sign = '';

  if (value > 0) {
    sign = '+';
  } else if (value < 0) {
    sign = '-';
  }

  return `${sign}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(value))}`;
}

function formatWeightEquivalentKg(value: number, locale: string) {
  return `~${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value) / 7700)}`;
}

function getCalorieBalanceStatusKey(difference: number) {
  if (Math.abs(difference) <= 100) {
    return 'goalTracking.balanceStatus.balanced';
  }

  return difference < 0
    ? 'goalTracking.balanceStatus.slightDeficit'
    : 'goalTracking.balanceStatus.slightSurplus';
}

function GoalMetric({
  label,
  value,
  meta,
  compact = false,
  emphasis = false,
}: {
  label: string;
  value: string;
  meta?: string;
  compact?: boolean;
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.metric, compact ? styles.metricCompact : null]}>
      <Text
        variant="caption"
        weight="bold"
        color="secondary"
        style={styles.metricLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        variant="caption"
        weight="bold"
        style={[styles.metricValue, emphasis ? styles.metricValueEmphasis : null]}
        numberOfLines={compact ? 2 : 1}
      >
        {value}
      </Text>
      {meta ? (
        <Text variant="caption" color="secondary" style={styles.metricMeta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export function GoalTrackingCard({ goalTracking, todaySummary }: GoalTrackingCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const activeGoal = goalTracking?.activeGoal;
  const goalCycleProgress = activeGoal ? getGoalCycleDayProgress(activeGoal) : null;
  const planProgressPercent = Math.min(
    100,
    Math.max(0, Math.round(activeGoal?.progressPercent ?? 0))
  );
  const planProgressCurrent = goalCycleProgress?.current ?? activeGoal?.progressValue ?? 0;
  const planProgressTarget = goalCycleProgress?.target ?? activeGoal?.targetValue ?? 30;
  const planTitle = activeGoal
    ? formatWeightGoalTitle(t, activeGoal.goal)
    : t('goalTracking.goalNames.maintainWithOneMonth');
  const planMode = activeGoal?.goal.mode ?? 'maintain';
  const achievedCalorieDelta =
    activeGoal?.unit === 'kcal'
      ? activeGoal.progressValue
      : (activeGoal?.consumedCalories ?? todaySummary.consumedCalories) -
        (activeGoal?.targetCalories ?? todaySummary.calorieTarget);
  const remainingCalorieDelta =
    activeGoal?.unit === 'kcal' ? activeGoal.remainingValue : Math.abs(achievedCalorieDelta);
  const signedAchievedCalorieDelta =
    planMode === 'lose' ? -achievedCalorieDelta : achievedCalorieDelta;
  const signedRemainingCalorieDelta =
    planMode === 'lose' ? -remainingCalorieDelta : remainingCalorieDelta;
  const balanceStatusKey = getCalorieBalanceStatusKey(achievedCalorieDelta);

  const startedAtDate = activeGoal?.goal.startedAt ? new Date(activeGoal.goal.startedAt) : null;
  const startedAtDay = startedAtDate
    ? new Date(startedAtDate.getFullYear(), startedAtDate.getMonth(), startedAtDate.getDate())
    : null;

  const endedAtDay = startedAtDay
    ? new Date(
        startedAtDay.getFullYear(),
        startedAtDay.getMonth(),
        startedAtDay.getDate() + planProgressTarget
      )
    : null;

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const startLabel = startedAtDay
    ? t('goalTracking.startDate', { value: formatDate(startedAtDay) })
    : '';
  const endLabel = endedAtDay ? t('goalTracking.endDate', { value: formatDate(endedAtDay) }) : '';

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Image source={GoalArrowImage} style={styles.image} contentFit="contain" />
        <View style={styles.copy}>
          <Text variant="body" weight="bold" numberOfLines={1} adjustsFontSizeToFit>
            {t('goalTracking.profileTitle')}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {t('statsScreen.todayProgress.subtitle')}
          </Text>
        </View>
        <View style={styles.circleWrap}>
          <GiftedCircularProgress
            progress={planProgressPercent}
            size={65}
            strokeWidth={7}
            trackColor={theme.colors.background.section}
            progressColor={theme.colors.brand.primary}
            accessibilityLabel={t('goalTracking.profileTitle')}
            style={styles.circle}
          >
            <Text variant="caption" weight="bold" color="primary" style={styles.percentText}>
              {`${planProgressPercent}%`}
            </Text>
          </GiftedCircularProgress>
        </View>
      </View>

      <View style={styles.metrics}>
        <GoalMetric label={t('goalTracking.activeTitle')} value={planTitle} compact emphasis />
        <View style={styles.divider} />
        <GoalMetric
          label={t('goalTracking.progressLabel')}
          value={`${formatNumber(planProgressCurrent, i18n.language)} / ${formatNumber(
            planProgressTarget,
            i18n.language
          )}\n${t('common.units.day')}`}
          compact
        />
        <View style={styles.divider} />
        {planMode === 'maintain' ? (
          <GoalMetric
            label={t('goalTracking.calorieDifferenceLabel')}
            value={`${formatSignedNumber(achievedCalorieDelta, i18n.language)} ${t(
              'common.units.kcal'
            )}`}
            compact
            emphasis
          />
        ) : (
          <GoalMetric
            label={
              planMode === 'lose'
                ? t('goalTracking.calorieDeficitLabel')
                : t('goalTracking.calorieSurplusLabel')
            }
            value={`${formatSignedNumber(signedAchievedCalorieDelta, i18n.language)} ${t(
              'common.units.kcal'
            )}`}
            meta={t('goalTracking.weightEquivalent', {
              value: formatWeightEquivalentKg(signedAchievedCalorieDelta, i18n.language),
            })}
            compact
            emphasis
          />
        )}
        <View style={styles.divider} />
        {planMode === 'maintain' ? (
          <GoalMetric
            label={t('goalTracking.statusLabel')}
            value={t(balanceStatusKey)}
            compact
            emphasis
          />
        ) : (
          <GoalMetric
            label={
              planMode === 'lose'
                ? t('goalTracking.remainingDeficitLabel')
                : t('goalTracking.remainingToTargetLabel')
            }
            value={`${formatNumber(Math.abs(signedRemainingCalorieDelta), i18n.language)} ${t(
              'common.units.kcal'
            )}`}
            meta={t('goalTracking.weightEquivalent', {
              value: formatWeightEquivalentKg(signedRemainingCalorieDelta, i18n.language),
            })}
            compact
            emphasis
          />
        )}
      </View>

      {startLabel || endLabel ? (
        <View style={styles.footer}>
          <Text variant="caption" color="secondary">
            {startLabel}
          </Text>
          <Text variant="caption" color="secondary">
            {endLabel}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  image: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
  },
  copy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignSelf: 'center',
  },
  percentText: {
    lineHeight: 16,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: theme.metrics.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.section,
  },
  metric: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    gap: theme.metrics.spacingV.p4,
  },
  metricCompact: {
    paddingHorizontal: theme.metrics.spacing.p8,
  },
  metricLabel: {
    minHeight: theme.metrics.spacing.p16,
    lineHeight: theme.fonts.size.sm,
  },
  metricValue: {
    lineHeight: 18,
  },
  metricValueEmphasis: {},
  metricMeta: {
    lineHeight: 16,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p4,
    marginTop: -theme.metrics.spacingV.p8,
  },
}));

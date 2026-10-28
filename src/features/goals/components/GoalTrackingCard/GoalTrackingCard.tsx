import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, GiftedCircularProgress, Icon, Text } from '@/common/components';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import type { GoalTrackingSnapshot, WeightGoalProgress } from '@/features/goals/types';
import { formatWeightGoalTitle } from '@/features/goals/utils/goalTracking';
import type { UserProfile } from '@/features/profile/types';
import { getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import GoalArrowImage from '../../../../../assets/goal-arrow.png';
import { MAINTAIN_BAND_KG } from '../../utils/weightGoal';
import { WeighInDialog } from '../WeighInDialog';

interface GoalTrackingCardProps {
  goalTracking: GoalTrackingSnapshot | null;
  todaySummary: DailyNutritionSummary;
  profile: UserProfile | null;
}

const numberFormatterCache = new Map<string, Intl.NumberFormat>();

// Intl formatters are expensive to construct on Hermes; reuse one per locale + fraction digits.
function getNumberFormatter(locale: string, maxFractionDigits = 0) {
  const cacheKey = `${locale}|${maxFractionDigits}`;
  let formatter = numberFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits });
    numberFormatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

function formatNumber(value: number, locale: string) {
  return getNumberFormatter(locale).format(value);
}

function formatKg(value: number, locale: string) {
  return getNumberFormatter(locale, 1).format(value);
}

function formatSignedKg(value: number, locale: string) {
  let sign = '';

  if (value > 0) {
    sign = '+';
  } else if (value < 0) {
    sign = '-';
  }

  return `${sign}${formatKg(Math.abs(value), locale)}`;
}

function formatDate(value: string | Date, locale: string) {
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function GoalMetric({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <View style={styles.metric}>
      <Text
        variant="caption"
        weight="bold"
        color="secondary"
        style={styles.metricLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text variant="caption" weight="bold" style={styles.metricValue} numberOfLines={1}>
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

/** Today's intake against the calorie range: what is left, on target, or how far over. */
function TodayCalories({
  todaySummary,
  profile,
}: {
  todaySummary: DailyNutritionSummary;
  profile: UserProfile | null;
}) {
  const { t, i18n } = useTranslation();
  const { consumedCalories, calorieTarget } = todaySummary;
  const state = getDailyCalorieGoalState(profile, calorieTarget, consumedCalories);
  const kcal = t('common.units.kcal');
  let statusLabel = t('goalTracking.today.onTarget');

  if (state === 'below_target') {
    statusLabel = t('goalTracking.today.remaining', {
      value: formatNumber(Math.max(0, calorieTarget - consumedCalories), i18n.language),
    });
  } else if (state === 'above_target') {
    statusLabel = t('goalTracking.today.over', {
      value: formatNumber(consumedCalories - calorieTarget, i18n.language),
    });
  }

  return (
    <View style={styles.todayRow}>
      <Text variant="caption" color="secondary">
        {t('goalTracking.today.label', {
          consumed: formatNumber(Math.round(consumedCalories), i18n.language),
          target: formatNumber(calorieTarget, i18n.language),
          unit: kcal,
        })}
      </Text>
      <Text
        variant="caption"
        weight="bold"
        style={state === 'above_target' ? styles.todayOver : styles.todayOk}
      >
        {statusLabel}
      </Text>
    </View>
  );
}

function WeightMetrics({ progress }: { progress: WeightGoalProgress }) {
  const { t, i18n } = useTranslation();
  const weight = progress.weight;

  if (!weight) {
    return null;
  }

  const kg = t('common.units.kg');
  const mode = progress.goal.mode;
  const current = (
    <GoalMetric
      label={t('goalTracking.currentWeightLabel')}
      value={`${formatKg(weight.currentKg, i18n.language)} ${kg}`}
    />
  );

  if (mode === 'maintain') {
    return (
      <View style={styles.metrics}>
        {current}
        <View style={styles.divider} />
        <GoalMetric
          label={t('goalTracking.driftLabel')}
          value={`${formatSignedKg(weight.changeKg, i18n.language)} ${kg}`}
          meta={t('goalTracking.bandHint', { value: MAINTAIN_BAND_KG })}
        />
        <View style={styles.divider} />
        <GoalMetric
          label={t('goalTracking.statusLabel')}
          value={t(weight.withinBand ? 'goalTracking.withinBand' : 'goalTracking.outsideBand')}
        />
      </View>
    );
  }

  return (
    <View style={styles.metrics}>
      {current}
      <View style={styles.divider} />
      <GoalMetric
        label={t(mode === 'lose' ? 'goalTracking.lostLabel' : 'goalTracking.gainedLabel')}
        value={`${formatSignedKg(weight.changeKg, i18n.language)} ${kg}`}
      />
      <View style={styles.divider} />
      <GoalMetric
        label={t('goalTracking.remainingWeightLabel')}
        value={`${formatKg(progress.remainingValue, i18n.language)} ${kg}`}
      />
    </View>
  );
}

export function GoalTrackingCard({ goalTracking, todaySummary, profile }: GoalTrackingCardProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const [isWeighing, setIsWeighing] = useState(false);
  const activeGoal = goalTracking?.activeGoal ?? null;
  const reachedGoal = activeGoal ? null : (goalTracking?.latestCompletedGoal ?? null);
  const shownGoal = activeGoal ?? reachedGoal;
  const progressPercent = Math.min(100, Math.max(0, Math.round(shownGoal?.progressPercent ?? 0)));
  const weight = shownGoal?.weight ?? null;
  const goalTitle = shownGoal
    ? formatWeightGoalTitle(t, shownGoal.goal)
    : t('goalTracking.goalNames.maintainWithOneMonth');
  const kg = t('common.units.kg');
  let subtitle = '';

  if (reachedGoal) {
    subtitle = t('goalTracking.reachedHint');
  } else if (weight && shownGoal?.goal.mode !== 'maintain') {
    subtitle = t('goalTracking.weightRoute', {
      start: formatKg(weight.startKg, i18n.language),
      target: formatKg(weight.targetKg, i18n.language),
      unit: kg,
    });
  } else if (weight) {
    subtitle = t('goalTracking.maintainRoute', {
      value: formatKg(weight.startKg, i18n.language),
      band: MAINTAIN_BAND_KG,
      unit: kg,
    });
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Image source={GoalArrowImage} style={styles.image} contentFit="contain" />
        <View style={styles.copy}>
          <Text variant="body" weight="bold" numberOfLines={1} adjustsFontSizeToFit>
            {reachedGoal
              ? t('goalTracking.reachedTitle', { goal: goalTitle })
              : t('goalTracking.planTitle', { goal: goalTitle })}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="secondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.circleWrap}>
          <GiftedCircularProgress
            progress={progressPercent}
            size={65}
            strokeWidth={7}
            trackColor={theme.colors.background.section}
            progressColor={theme.colors.brand.primary}
            accessibilityLabel={t('goalTracking.profileTitle')}
            style={styles.circle}
          >
            <Text variant="caption" weight="bold" color="primary" style={styles.percentText}>
              {`${progressPercent}%`}
            </Text>
          </GiftedCircularProgress>
        </View>
      </View>

      {activeGoal ? <WeightMetrics progress={activeGoal} /> : null}

      <TodayCalories todaySummary={todaySummary} profile={profile} />

      {activeGoal && weight ? (
        <View style={styles.footer}>
          <Text variant="caption" color="secondary">
            {t('goalTracking.startDate', {
              value: formatDate(activeGoal.goal.startedAt, i18n.language),
            })}
          </Text>
          <Text variant="caption" color="secondary">
            {t('goalTracking.expectedDate', {
              value: formatDate(weight.expectedEndDate, i18n.language),
            })}
          </Text>
        </View>
      ) : null}

      {reachedGoal ? (
        <Button
          title={t('goalTracking.newGoalAction')}
          variant="primary"
          size="sm"
          fullWidth
          leftIcon={<Icon name="flag-outline" variant="onBrand" size={16} />}
          onPress={() => router.push('/welcome')}
        />
      ) : (
        <Button
          title={t('goalTracking.weighIn.action')}
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<Icon name="scale-outline" variant="accent" size={16} />}
          onPress={() => setIsWeighing(true)}
        />
      )}

      <WeighInDialog
        visible={isWeighing}
        onDismiss={() => setIsWeighing(false)}
        initialWeightKg={profile?.weightKg ?? null}
      />
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    gap: theme.metrics.spacingV.p4,
  },
  metricLabel: {
    minHeight: theme.metrics.spacing.p16,
    lineHeight: theme.fonts.size.sm,
    textAlign: 'center',
  },
  metricValue: {
    lineHeight: 18,
    textAlign: 'center',
  },
  metricMeta: {
    lineHeight: 16,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  todayOk: {
    color: theme.colors.state.success,
  },
  todayOver: {
    color: theme.colors.state.warning,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p4,
  },
}));

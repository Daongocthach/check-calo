import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Loading, ScreenContainer, SegmentedControl, Text } from '@/common/components';
import { formatDayDate, formatWholeNumber, toLocale } from '@/features/food-log/utils/format';
import { addDays } from '@/features/goals/utils/weightGoal';
import { hs } from '@/theme/metrics';
import { formatDateKey } from '@/utils/date';
import { BUDDY_AXES, BUDDY_AXIS_ICONS, BUDDY_AXIS_TOP_FOOD_MEASURE } from '../constants/stats';
import { useBuddyName } from '../hooks/useBuddyName';
import { useBuddyStats, useTopFoods } from '../hooks/useBuddyStats';
import type { BuddyAxis } from '../types';
import {
  getAxisAverages,
  getAxisChartPoints,
  getRangeDays,
  summarizeAxis,
  type StatsRange,
} from '../utils/axisDetail';
import { AxisScoreChart } from './AxisScoreChart';
import { BuddySticker } from './BuddySticker';

const RANGES: readonly StatsRange[] = ['week', 'month', 'all'];
const RANGE_DAYS = { week: 7, month: 30 } as const;
const STICKER_SIZE = hs(56);

function isBuddyAxis(value: string | undefined): value is BuddyAxis {
  return BUDDY_AXES.some((axis) => axis === value);
}

function isStatsRange(value: string): value is StatsRange {
  return RANGES.some((range) => range === value);
}

export interface BuddyAxisDetailScreenProps {
  axis: string | undefined;
}

/** One of Buddy's stats in detail: score over time, what drives it and how to raise it. */
export function BuddyAxisDetailScreen({ axis }: BuddyAxisDetailScreenProps) {
  const { t } = useTranslation();

  if (!isBuddyAxis(axis)) {
    return (
      <ScreenContainer padded edges={['bottom']} title={t('buddy.title')}>
        <Text color="secondary">{t('buddy.detail.notFound')}</Text>
      </ScreenContainer>
    );
  }

  return <AxisDetail axis={axis} />;
}

function AxisDetail({ axis }: { axis: BuddyAxis }) {
  const { t, i18n } = useTranslation();
  const { name } = useBuddyName();
  const { data: stats } = useBuddyStats();
  const [range, setRange] = useState<StatsRange>('week');
  const today = formatDateKey(new Date());
  const firstDate = stats?.days[0]?.date ?? today;
  const rangeStart = range === 'all' ? firstDate : addDays(today, -(RANGE_DAYS[range] - 1));
  const measure = BUDDY_AXIS_TOP_FOOD_MEASURE[axis];
  const { data: topFoods } = useTopFoods(measure, rangeStart, today);

  if (!stats) {
    return <Loading />;
  }

  const days = getRangeDays(stats.days, range);
  const summary = summarizeAxis(days, axis);
  const points = getAxisChartPoints(days, axis, range);
  const averages = getAxisAverages(days, axis);
  const goalMode = stats.days.at(-1)?.summary.goalMode ?? 'maintain';
  const formatAverage = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : formatWholeNumber(value, i18n.language);
  const valueParams = {
    // Main meals average below 3, so they keep one decimal.
    value:
      axis === 'meals' && typeof averages.value === 'number'
        ? averages.value.toLocaleString(toLocale(i18n.language))
        : formatAverage(averages.value),
    target: formatAverage(averages.target),
    late: formatAverage(averages.late),
    protein: formatAverage(averages.protein),
    carbs: formatAverage(averages.carbs),
    fat: formatAverage(averages.fat),
    fiber: formatAverage(averages.fiber),
    sodium: formatAverage(averages.sodium),
    sugar: formatAverage(averages.sugar),
  };

  return (
    <ScreenContainer
      scrollable
      padded={false}
      edges={['bottom']}
      title={t(`buddy.axes.${axis}.name`)}
    >
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.scoreRow}>
            <View style={styles.iconCircle}>
              <Icon name={BUDDY_AXIS_ICONS[axis]} variant="brand" size={24} />
            </View>
            <View style={styles.flex}>
              <Text variant="caption" color="secondary">
                {t('buddy.detail.averageScore')}
              </Text>
              <Text variant="h2" weight="bold" color="link">
                {summary.average === null ? '—' : summary.average}
              </Text>
            </View>
          </View>
          <Text variant="bodySmall">{t(`buddy.axes.${axis}.measure`)}</Text>
          <Text variant="bodySmall" color="secondary">
            {axis === 'calories'
              ? t(`buddy.calorieGoal.${goalMode}`)
              : t(`buddy.axes.${axis}.goal`)}
          </Text>
        </View>

        <SegmentedControl
          value={range}
          onChange={(value) => {
            if (isStatsRange(value)) {
              setRange(value);
            }
          }}
          options={RANGES.map((value) => ({
            value,
            label: t(`buddy.detail.ranges.${value}`),
          }))}
        />

        <View style={styles.card}>
          <Text variant="body" weight="bold">
            {range === 'all' ? t('buddy.detail.chartTitleWeekly') : t('buddy.detail.chartTitle')}
          </Text>
          {summary.scoredDays === 0 ? (
            <Text variant="bodySmall" color="secondary">
              {axis === 'quality' ? t('buddy.detail.noDataQuality') : t('buddy.detail.noData')}
            </Text>
          ) : (
            <AxisScoreChart points={points} range={range} language={i18n.language} />
          )}
          <Text variant="caption" color="tertiary">
            {t('buddy.detail.todayPending')}
          </Text>
        </View>

        {summary.scoredDays > 0 ? (
          <View style={styles.card}>
            {/* The averages line is the longest, so it gets a line of its own. */}
            <View style={styles.averages}>
              <Text variant="bodySmall" color="secondary">
                {t('buddy.detail.dailyAverage')}
              </Text>
              <Text variant="bodySmall" weight="semibold">
                {t(`buddy.detail.values.${axis}`, valueParams)}
              </Text>
            </View>
            <StatRow
              label={t('buddy.detail.metDays')}
              value={t('buddy.detail.metDaysValue', {
                met: summary.metDays,
                total: summary.scoredDays,
              })}
            />
            {summary.best ? (
              <StatRow
                label={t('buddy.detail.bestDay')}
                value={t('buddy.detail.bestDayValue', {
                  date: formatDayDate(summary.best.date, i18n.language),
                  score: summary.best.scores[axis],
                })}
              />
            ) : null}
          </View>
        ) : null}

        {measure && topFoods && topFoods.length > 0 ? (
          <View style={styles.card}>
            <Text variant="body" weight="bold">
              {t(`buddy.detail.topFoods.${measure}`)}
            </Text>
            {topFoods.map((food) => (
              <View key={food.name} style={styles.foodRow}>
                <Text variant="bodySmall" style={styles.flex} numberOfLines={1}>
                  {food.name}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {t(`buddy.detail.amounts.${measure}`, {
                    value: formatWholeNumber(food.total, i18n.language),
                  })}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('buddy.detail.timesEaten', { count: food.count })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.card, styles.tip]}>
          <BuddySticker pose="checklist" size={STICKER_SIZE} />
          <View style={styles.flex}>
            <Text variant="bodySmall" weight="bold">
              {t('buddy.detail.tipTitle', { name })}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {t(`buddy.axes.${axis}.tip`)}
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text variant="bodySmall" color="secondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="semibold">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  iconCircle: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  flex: {
    flex: 1,
  },
  averages: {
    gap: theme.metrics.spacingV.p4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}));

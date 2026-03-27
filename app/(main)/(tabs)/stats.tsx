import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';
import {
  LineChart,
  PieChart,
  type lineDataItem,
  type pieDataItem,
} from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, ProgressBar, ScreenContainer, SegmentedControl, Text } from '@/common/components';
import {
  getDailyNutritionSummary,
  listDailyNutritionSummaries,
} from '@/features/nutrition/services/nutritionDatabase';
import type { DailyNutritionSummary, NutritionTrendPoint } from '@/features/nutrition/types';
import { hs, vs } from '@/theme/metrics';

type TrendMode = 'day' | 'week' | 'month';

const TREND_MODE_OPTIONS: TrendMode[] = ['day', 'week', 'month'];

function createEmptySummary(date: Date): DailyNutritionSummary {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    calorieTarget: 0,
    consumedCalories: 0,
    remainingCalories: 0,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

function getWeekdayLabel(date: Date, t: ReturnType<typeof useTranslation>['t']) {
  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  return t(`statsScreen.days.${weekdayKeys[date.getDay()]}`);
}

function getStartOfWeek(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  const weekdayIndex = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - weekdayIndex);
  return nextDate;
}

function getMonthLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

function aggregateTrendData(
  points: NutritionTrendPoint[],
  mode: TrendMode,
  t: ReturnType<typeof useTranslation>['t']
) {
  if (mode === 'day') {
    return points.slice(-7).map((point) => {
      const pointDate = new Date(`${point.date}T00:00:00`);
      return {
        ...point,
        label: getWeekdayLabel(pointDate, t),
      };
    });
  }

  if (mode === 'week') {
    const weekMap = new Map<string, NutritionTrendPoint>();

    points.forEach((point) => {
      const pointDate = new Date(`${point.date}T00:00:00`);
      const weekStart = getStartOfWeek(pointDate);
      const key = weekStart.toISOString();
      const existing = weekMap.get(key);

      if (existing) {
        existing.consumedCalories += point.consumedCalories;
        existing.proteinGrams += point.proteinGrams;
        existing.carbsGrams += point.carbsGrams;
        existing.fatGrams += point.fatGrams;
        existing.calorieTarget += point.calorieTarget;
        existing.remainingCalories += point.remainingCalories;
        return;
      }

      weekMap.set(key, {
        ...point,
        label: `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}`,
      });
    });

    return Array.from(weekMap.values()).slice(-8);
  }

  const monthMap = new Map<string, NutritionTrendPoint>();

  points.forEach((point) => {
    const pointDate = new Date(`${point.date}T00:00:00`);
    const key = `${pointDate.getFullYear()}-${pointDate.getMonth()}`;
    const existing = monthMap.get(key);

    if (existing) {
      existing.consumedCalories += point.consumedCalories;
      existing.proteinGrams += point.proteinGrams;
      existing.carbsGrams += point.carbsGrams;
      existing.fatGrams += point.fatGrams;
      existing.calorieTarget += point.calorieTarget;
      existing.remainingCalories += point.remainingCalories;
      return;
    }

    monthMap.set(key, {
      ...point,
      label: getMonthLabel(pointDate),
    });
  });

  return Array.from(monthMap.values()).slice(-6);
}

export default function StatsTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { width } = useWindowDimensions();
  const [trendMode, setTrendMode] = useState<TrendMode>('day');
  const [todaySummary, setTodaySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(new Date())
  );
  const [dailyPoints, setDailyPoints] = useState<NutritionTrendPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadStats = async () => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 179);

        const [summary, trendPoints] = await Promise.all([
          getDailyNutritionSummary(today),
          listDailyNutritionSummaries(startDate, today),
        ]);

        if (!active) {
          return;
        }

        setTodaySummary(summary);
        setDailyPoints(trendPoints);
      };

      void loadStats();

      return () => {
        active = false;
      };
    }, [])
  );

  const macroTotal = todaySummary.proteinGrams + todaySummary.carbsGrams + todaySummary.fatGrams;

  const macroPieData = useMemo<pieDataItem[]>(() => {
    return [
      {
        value: todaySummary.proteinGrams,
        color: theme.colors.state.info,
        text: `${Math.round(todaySummary.proteinGrams)}g`,
      },
      {
        value: todaySummary.carbsGrams,
        color: theme.colors.state.warning,
        text: `${Math.round(todaySummary.carbsGrams)}g`,
      },
      {
        value: todaySummary.fatGrams,
        color: theme.colors.state.success,
        text: `${Math.round(todaySummary.fatGrams)}g`,
      },
    ];
  }, [
    theme.colors.state.info,
    theme.colors.state.success,
    theme.colors.state.warning,
    todaySummary.carbsGrams,
    todaySummary.fatGrams,
    todaySummary.proteinGrams,
  ]);

  const aggregatedTrendPoints = useMemo(
    () => aggregateTrendData(dailyPoints, trendMode, t),
    [dailyPoints, t, trendMode]
  );

  const lineData = useMemo<lineDataItem[]>(
    () =>
      aggregatedTrendPoints.map((point) => ({
        value: Math.round(point.consumedCalories),
        label: point.label,
      })),
    [aggregatedTrendPoints]
  );

  const lineChartWidth = Math.max(width - hs(72), hs(320));

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.progressCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('statsScreen.todayProgress.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.todayProgress.subtitle')}
              </Text>
            </View>
            <Text variant="h2">{`${todaySummary.progressPercent}%`}</Text>
          </View>

          <ProgressBar value={todaySummary.progressPercent} size="lg" colorScheme="success" />

          <View style={styles.metricGrid}>
            <Card variant="filled" style={[styles.metricCard, styles.metricCardLarge]}>
              <Text variant="h2">{todaySummary.consumedCalories}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.metrics.caloriesConsumed')}
              </Text>
            </Card>
            <Card variant="filled" style={styles.metricCard}>
              <Text variant="h3">{todaySummary.calorieTarget}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.metrics.calorieTarget')}
              </Text>
            </Card>
            <Card variant="filled" style={styles.metricCard}>
              <Text variant="h3">{todaySummary.remainingCalories}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.metrics.remainingCalories')}
              </Text>
            </Card>
          </View>
        </Card>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('statsScreen.macros.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.macros.subtitle')}
              </Text>
            </View>
          </View>

          {macroTotal > 0 ? (
            <>
              <View style={styles.pieChartWrap}>
                <PieChart
                  data={macroPieData}
                  donut
                  radius={hs(86)}
                  innerRadius={hs(58)}
                  innerCircleColor={theme.colors.background.surface}
                  strokeColor={theme.colors.background.surface}
                  strokeWidth={2}
                  showText
                  textColor={theme.colors.text.primary}
                  textSize={12}
                  showValuesAsLabels
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text variant="caption" color="secondary">
                        {t('statsScreen.macros.centerLabel')}
                      </Text>
                      <Text variant="h3">{`${Math.round(macroTotal)} ${t('common.units.gram')}`}</Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.macroLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotProtein]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.protein')}</Text>
                    <Text variant="caption" color="secondary">
                      {`${Math.round(todaySummary.proteinGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotCarbs]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.carbs')}</Text>
                    <Text variant="caption" color="secondary">
                      {`${Math.round(todaySummary.carbsGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotFat]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.fat')}</Text>
                    <Text variant="caption" color="secondary">
                      {`${Math.round(todaySummary.fatGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="bodySmall" color="secondary" align="center">
                {t('statsScreen.macros.empty')}
              </Text>
            </View>
          )}
        </Card>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('statsScreen.trends.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.trends.subtitle')}
              </Text>
            </View>
          </View>

          <SegmentedControl
            value={trendMode}
            onChange={(value) => setTrendMode(value as TrendMode)}
            options={TREND_MODE_OPTIONS.map((mode) => ({
              label: t(`statsScreen.modes.${mode}`),
              value: mode,
            }))}
            size="sm"
          />

          <View style={styles.lineChartWrap}>
            <LineChart
              data={lineData}
              areaChart
              curved
              height={vs(220)}
              width={lineChartWidth}
              color={theme.colors.brand.secondary}
              startFillColor={theme.colors.brand.primary}
              endFillColor={theme.colors.brand.primary}
              startOpacity={0.28}
              endOpacity={0.04}
              thickness={3}
              hideDataPoints={false}
              dataPointsRadius={4}
              dataPointsColor={theme.colors.brand.secondary}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              yAxisColor={theme.colors.border.subtle}
              xAxisColor={theme.colors.border.subtle}
              rulesColor={theme.colors.border.subtle}
              noOfSections={4}
              initialSpacing={12}
              endSpacing={12}
              spacing={
                lineData.length > 1 ? Math.max(42, lineChartWidth / lineData.length - 8) : 64
              }
              maxValue={Math.max(100, ...lineData.map((item) => item.value ?? 0))}
            />
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  progressCard: {
    gap: theme.metrics.spacingV.p16,
  },
  chartCard: {
    gap: theme.metrics.spacingV.p16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    gap: vs(6),
    backgroundColor: theme.colors.background.surface,
  },
  metricCardLarge: {
    minWidth: '100%',
    backgroundColor: theme.colors.background.section,
  },
  pieChartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  macroLegend: {
    gap: theme.metrics.spacingV.p12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  legendDot: {
    width: theme.metrics.spacing.p12,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
  },
  legendDotProtein: {
    backgroundColor: theme.colors.state.info,
  },
  legendDotCarbs: {
    backgroundColor: theme.colors.state.warning,
  },
  legendDotFat: {
    backgroundColor: theme.colors.state.success,
  },
  legendCopy: {
    gap: theme.metrics.spacingV.p4,
  },
  lineChartWrap: {
    overflow: 'hidden',
  },
  axisText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  emptyState: {
    minHeight: vs(180),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p16,
  },
}));

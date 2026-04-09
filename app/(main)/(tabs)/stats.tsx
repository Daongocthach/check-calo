import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { PieChart, type pieDataItem } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Card,
  LineTrendChart,
  ProgressBar,
  ScreenContainer,
  SegmentedControl,
  StackedMacroBarChart,
  Text,
} from '@/common/components';
import {
  getDailyNutritionSummary,
  getUserProfile,
  listDailyNutritionSummaries,
} from '@/features/nutrition/services/nutritionDatabase';
import type {
  DailyNutritionSummary,
  NutritionTrendPoint,
  UserProfile,
} from '@/features/nutrition/types';
import { getDailyCalorieGoalState } from '@/features/nutrition/utils/calorie';
import { hs, vs } from '@/theme/metrics';

type TrendMode = 'day' | 'month';

const TREND_MODE_OPTIONS: TrendMode[] = ['day', 'month'];

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

function createEmptyDailyTrendPoint(
  date: Date,
  t: ReturnType<typeof useTranslation>['t']
): NutritionTrendPoint {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    label: getWeekdayLabel(date, t),
    calorieTarget: 0,
    consumedCalories: 0,
    remainingCalories: 0,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

function getMonthLabel(date: Date, locale: string) {
  if (locale.startsWith('vi')) {
    return `Th${date.getMonth() + 1}`;
  }

  return new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(date)
    .replace('.', '')
    .toLowerCase();
}

function createEmptyTrendPoint(date: Date, locale: string): NutritionTrendPoint {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return {
    date: `${year}-${month}-01`,
    label: getMonthLabel(date, locale),
    calorieTarget: 0,
    consumedCalories: 0,
    remainingCalories: 0,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

function aggregateTrendData(
  points: NutritionTrendPoint[],
  mode: TrendMode,
  t: ReturnType<typeof useTranslation>['t'],
  locale: string,
  referenceDate: Date
) {
  if (mode === 'day') {
    const weekdayMap = new Map<number, NutritionTrendPoint>();

    points.forEach((point) => {
      const pointDate = new Date(`${point.date}T00:00:00`);
      weekdayMap.set(pointDate.getDay(), {
        ...point,
        label: getWeekdayLabel(pointDate, t),
      });
    });

    return Array.from({ length: 7 }, (_, index) => {
      const dayPoint = weekdayMap.get(index);

      if (dayPoint) {
        return dayPoint;
      }

      const fallbackDate = new Date(referenceDate);
      fallbackDate.setDate(referenceDate.getDate() - ((referenceDate.getDay() - index + 7) % 7));
      return createEmptyDailyTrendPoint(fallbackDate, t);
    });
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
      label: getMonthLabel(pointDate, locale),
    });
  });

  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(referenceDate.getFullYear(), index, 1);
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
    const point = monthMap.get(key);

    if (!point) {
      return createEmptyTrendPoint(monthDate, locale);
    }

    return {
      ...point,
      label: getMonthLabel(monthDate, locale),
    };
  });
}

export default function StatsTab() {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const [trendMode, setTrendMode] = useState<TrendMode>('day');
  const [macroTrendMode, setMacroTrendMode] = useState<TrendMode>('day');
  const [todaySummary, setTodaySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(new Date())
  );
  const [dailyPoints, setDailyPoints] = useState<NutritionTrendPoint[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadStats = async () => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 179);

        const [summary, trendPoints, nextProfile] = await Promise.all([
          getDailyNutritionSummary(today),
          listDailyNutritionSummaries(startDate, today),
          getUserProfile(),
        ]);

        if (!active) {
          return;
        }

        setTodaySummary(summary);
        setDailyPoints(trendPoints);
        setProfile(nextProfile);
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
        text: `${Math.round(todaySummary.proteinGrams)}`,
      },
      {
        value: todaySummary.carbsGrams,
        color: theme.colors.state.warning,
        text: `${Math.round(todaySummary.carbsGrams)}`,
      },
      {
        value: todaySummary.fatGrams,
        color: theme.colors.state.success,
        text: `${Math.round(todaySummary.fatGrams)}`,
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
    () => aggregateTrendData(dailyPoints, trendMode, t, i18n.language, new Date()),
    [dailyPoints, i18n.language, t, trendMode]
  );

  const lineData = useMemo(
    () =>
      aggregatedTrendPoints.map((point) => ({
        value: Math.round(point.consumedCalories),
        label: point.label,
      })),
    [aggregatedTrendPoints]
  );

  const aggregatedMacroTrendPoints = useMemo(
    () => aggregateTrendData(dailyPoints, macroTrendMode, t, i18n.language, new Date()),
    [dailyPoints, i18n.language, macroTrendMode, t]
  );

  const todayGoalState = useMemo(
    () =>
      getDailyCalorieGoalState(profile, todaySummary.calorieTarget, todaySummary.consumedCalories),
    [profile, todaySummary.calorieTarget, todaySummary.consumedCalories]
  );

  let progressColorScheme: 'success' | 'warning' | 'error' = 'success';

  if (todayGoalState === 'below_target') {
    progressColorScheme = 'warning';
  } else if (todayGoalState === 'above_target') {
    progressColorScheme = 'error';
  }

  const stackedMacroData = useMemo(
    () =>
      aggregatedMacroTrendPoints.map((point) => ({
        label: point.label,
        proteinValue: Math.round(point.proteinGrams),
        carbsValue: Math.round(point.carbsGrams),
        fatValue: Math.round(point.fatGrams),
      })),
    [aggregatedMacroTrendPoints]
  );

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

          <ProgressBar
            value={todaySummary.progressPercent}
            size="lg"
            colorScheme={progressColorScheme}
          />

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
              <Text variant="h3">{Math.abs(todaySummary.remainingCalories)}</Text>
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
            <View style={styles.macrosContent}>
              <View style={styles.pieChartWrap}>
                <PieChart
                  data={macroPieData}
                  donut
                  radius={hs(80)}
                  innerRadius={hs(45)}
                  innerCircleColor={theme.colors.background.surface}
                  strokeColor={theme.colors.background.surface}
                  strokeWidth={2}
                  showText
                  textColor={theme.colors.text.onBrand}
                  textSize={12}
                  fontWeight="700"
                  showValuesAsLabels
                />
              </View>

              <View style={styles.macroLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotProtein]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.protein')}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${Math.round(todaySummary.proteinGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotCarbs]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.carbs')}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${Math.round(todaySummary.carbsGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendDotFat]} />
                  <View style={styles.legendCopy}>
                    <Text variant="bodySmall">{t('statsScreen.macros.fat')}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${Math.round(todaySummary.fatGrams)} ${t('common.units.gram')}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
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
            <LineTrendChart data={lineData} scrollEnabled={trendMode === 'month'} />
          </View>
        </Card>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('statsScreen.macroDistribution.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.macroDistribution.subtitle')}
              </Text>
            </View>
          </View>

          <SegmentedControl
            value={macroTrendMode}
            onChange={(value) => setMacroTrendMode(value as TrendMode)}
            options={TREND_MODE_OPTIONS.map((mode) => ({
              label: t(`statsScreen.modes.${mode}`),
              value: mode,
            }))}
            size="sm"
          />

          <StackedMacroBarChart
            data={stackedMacroData}
            proteinLabel={t('statsScreen.macros.protein')}
            carbsLabel={t('statsScreen.macros.carbs')}
            fatLabel={t('statsScreen.macros.fat')}
            gramUnit={t('common.units.gram')}
            scrollEnabled
          />
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
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
  },
  macrosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  macroLegend: {
    flex: 1,
    gap: theme.metrics.spacingV.p12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  lineChartWrap: {
    overflow: 'hidden',
  },
  emptyState: {
    minHeight: vs(180),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p16,
  },
}));

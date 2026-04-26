import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Icon, ProgressBar, ScreenContainer, SegmentedControl, Text } from '@/common/components';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import {
  getDailyNutritionSummary,
  getUserProfile,
  listDailyNutritionSummaries,
} from '@/features/nutrition/services/nutritionDatabase';
import type {
  DailyNutritionSummary,
  GoalTrackingSnapshot,
  NutritionTrendPoint,
  UserProfile,
} from '@/features/nutrition/types';
import {
  formatWeightGoalTitle,
  getGoalCycleDayProgress,
} from '@/features/nutrition/utils/goalTracking';
import { useCurrentDate } from '@/hooks';
import { hs, vs } from '@/theme/metrics';
import GoalArrowImage from '../../../assets/goal-arrow.png';

type TrendMode = 'day' | 'month';
type TranslateFn = (key: string) => string;

const TREND_MODE_OPTIONS: TrendMode[] = ['day', 'month'];

const STAT_EMOJIS = {
  sunrise: String.fromCodePoint(0x1f305),
  flag: String.fromCodePoint(0x1f1fb, 0x1f1f3),
  leaf: String.fromCodePoint(0x1f343),
  fire: String.fromCodePoint(0x1f525),
  target: String.fromCodePoint(0x1f3af),
  purpleFlag: String.fromCodePoint(0x1f6a9),
  salmon: String.fromCodePoint(0x1f363),
  avocado: String.fromCodePoint(0x1f951),
  rice: String.fromCodePoint(0x1f35a),
};

interface MacroStat {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  value: number;
  target: number;
  percent: number;
  color: string;
}

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

function getWeekdayLabel(date: Date, t: TranslateFn) {
  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  return t(`statsScreen.days.${weekdayKeys[date.getDay()]}`);
}

function createEmptyDailyTrendPoint(date: Date, t: TranslateFn): NutritionTrendPoint {
  const summary = createEmptySummary(date);

  return {
    ...summary,
    label: getWeekdayLabel(date, t),
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

function createEmptyMonthTrendPoint(date: Date, locale: string): NutritionTrendPoint {
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
  t: TranslateFn,
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
      return createEmptyMonthTrendPoint(monthDate, locale);
    }

    return {
      ...point,
      label: getMonthLabel(monthDate, locale),
    };
  });
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function getProgressPercent(value: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return clampPercent((value / target) * 100);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function createSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previousPoint = points[index - 1];
    const controlDistance = (point.x - previousPoint.x) / 2;
    return `${path} C ${previousPoint.x + controlDistance} ${previousPoint.y}, ${
      point.x - controlDistance
    } ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function createStackSegmentPath({
  x,
  y,
  width,
  height,
  radius,
  roundTop,
  roundBottom,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  roundTop: boolean;
  roundBottom: boolean;
}) {
  if (height <= 0) {
    return '';
  }

  const r = Math.min(radius, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;

  if (roundTop) {
    return [
      `M ${x} ${y + r}`,
      `Q ${x} ${y} ${x + r} ${y}`,
      `L ${right - r} ${y}`,
      `Q ${right} ${y} ${right} ${y + r}`,
      `L ${right} ${bottom}`,
      `L ${x} ${bottom}`,
      'Z',
    ].join(' ');
  }

  if (roundBottom) {
    return [
      `M ${x} ${y}`,
      `L ${right} ${y}`,
      `L ${right} ${bottom - r}`,
      `Q ${right} ${bottom} ${right - r} ${bottom}`,
      `L ${x + r} ${bottom}`,
      `Q ${x} ${bottom} ${x} ${bottom - r}`,
      'Z',
    ].join(' ');
  }

  return `M ${x} ${y} L ${right} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`;
}

export default function StatsTab() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();
  const currentDate = useCurrentDate();
  const [trendMode, setTrendMode] = useState<TrendMode>('day');
  const [macroTrendMode, setMacroTrendMode] = useState<TrendMode>('day');
  const [todaySummary, setTodaySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(currentDate)
  );
  const [dailyPoints, setDailyPoints] = useState<NutritionTrendPoint[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalTracking, setGoalTracking] = useState<GoalTrackingSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadStats = async () => {
        const startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 179);

        const [summary, trendPoints, nextProfile, goalTrackingSnapshot] = await Promise.all([
          getDailyNutritionSummary(currentDate),
          listDailyNutritionSummaries(startDate, currentDate),
          getUserProfile(),
          syncGoalTracking(),
        ]);

        if (!active) {
          return;
        }

        setTodaySummary(summary);
        setDailyPoints(trendPoints);
        setProfile(nextProfile);
        setGoalTracking(goalTrackingSnapshot);
      };

      void loadStats();

      return () => {
        active = false;
      };
    }, [currentDate])
  );

  const todayProgressPercent = clampPercent(todaySummary.progressPercent);
  const consumedCalories = Math.max(0, Math.round(todaySummary.consumedCalories));
  const targetCalories = Math.max(0, Math.round(todaySummary.calorieTarget));
  const remainingCalories = Math.abs(Math.round(todaySummary.remainingCalories));
  const planProgressPercent = clampPercent(goalTracking?.activeGoal?.progressPercent ?? 0);
  const goalCycleProgress = goalTracking?.activeGoal
    ? getGoalCycleDayProgress(goalTracking.activeGoal)
    : null;
  const planProgressCurrent =
    goalCycleProgress?.current ?? goalTracking?.activeGoal?.progressValue ?? 0;
  const planProgressTarget =
    goalCycleProgress?.target ?? goalTracking?.activeGoal?.targetValue ?? 30;
  const planTitle = goalTracking?.activeGoal
    ? formatWeightGoalTitle(t, goalTracking.activeGoal.goal)
    : t('goalTracking.goalNames.maintainWithOneMonth');

  const trendModeOptions = useMemo(
    () =>
      TREND_MODE_OPTIONS.map((mode) => ({
        label: t(`statsScreen.modes.${mode}`),
        value: mode,
      })),
    [t]
  );

  const macroStats = useMemo<MacroStat[]>(
    () => [
      {
        key: 'protein',
        label: t('statsScreen.macros.protein'),
        value: Math.round(todaySummary.proteinGrams),
        target: Math.round(profile?.proteinTargetGrams ?? 100),
        percent: getProgressPercent(todaySummary.proteinGrams, profile?.proteinTargetGrams ?? 100),
        color: theme.colors.state.success,
      },
      {
        key: 'carbs',
        label: t('statsScreen.macros.carbs'),
        value: Math.round(todaySummary.carbsGrams),
        target: Math.round(profile?.carbsTargetGrams ?? 300),
        percent: getProgressPercent(todaySummary.carbsGrams, profile?.carbsTargetGrams ?? 300),
        color: theme.colors.state.warning,
      },
      {
        key: 'fat',
        label: t('statsScreen.macros.fat'),
        value: Math.round(todaySummary.fatGrams),
        target: Math.round(profile?.fatTargetGrams ?? 70),
        percent: getProgressPercent(todaySummary.fatGrams, profile?.fatTargetGrams ?? 70),
        color: theme.colors.brand.tertiary,
      },
    ],
    [
      profile?.carbsTargetGrams,
      profile?.fatTargetGrams,
      profile?.proteinTargetGrams,
      t,
      theme.colors.brand.tertiary,
      theme.colors.state.success,
      theme.colors.state.warning,
      todaySummary.carbsGrams,
      todaySummary.fatGrams,
      todaySummary.proteinGrams,
    ]
  );

  const aggregatedTrendPoints = useMemo(
    () => aggregateTrendData(dailyPoints, trendMode, translate, i18n.language, currentDate),
    [currentDate, dailyPoints, i18n.language, translate, trendMode]
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
    () => aggregateTrendData(dailyPoints, macroTrendMode, translate, i18n.language, currentDate),
    [currentDate, dailyPoints, i18n.language, macroTrendMode, translate]
  );

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
  const monthSummary = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthPoints = dailyPoints.filter((point) => {
      const pointDate = new Date(`${point.date}T00:00:00`);
      return pointDate.getMonth() === currentMonth && pointDate.getFullYear() === currentYear;
    });
    const totalCalories = monthPoints.reduce((total, point) => total + point.consumedCalories, 0);
    const loggedDayCount = new Set(monthPoints.map((point) => point.date)).size;
    const averageCalories = loggedDayCount > 0 ? totalCalories / loggedDayCount : 0;

    return {
      totalCalories,
      averageCalories,
      targetCalories: targetCalories || profile?.dailyCalorieTarget || 0,
    };
  }, [currentDate, dailyPoints, profile?.dailyCalorieTarget, targetCalories]);

  const handleTrendModeChange = (value: string) => {
    if (value === 'day' || value === 'month') {
      setTrendMode(value);
    }
  };

  const handleMacroTrendModeChange = (value: string) => {
    if (value === 'day' || value === 'month') {
      setMacroTrendMode(value);
    }
  };

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.planCard}>
          <Image source={GoalArrowImage} style={styles.goalImage} contentFit="contain" />
          <View style={styles.planCopy}>
            <Text
              variant="h3"
              weight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.cardTitle}
            >
              {t('goalTracking.profileTitle')}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.cardSubtitle}>
              {t('statsScreen.todayProgress.subtitle')}
            </Text>
          </View>
          <View style={styles.circleProgress}>
            <View style={styles.circleTrack}>
              <View style={styles.circleCap} />
              <Text variant="h2" weight="bold" color="primary" style={styles.circlePercentText}>
                {`${planProgressPercent}%`}
              </Text>
            </View>
          </View>
          <View style={styles.planMetrics}>
            <View style={styles.planMetric}>
              <Text variant="caption" style={styles.metricLabel}>
                {t('goalTracking.activeTitle')}
              </Text>
              <Text variant="bodySmall" weight="bold" style={styles.metricValue}>
                {planTitle}
              </Text>
            </View>
            <View style={styles.planDivider} />
            <View style={styles.planMetric}>
              <Text variant="caption" style={styles.metricLabel}>
                {t('goalTracking.progressLabel')}
              </Text>
              <Text variant="bodySmall" weight="bold" style={styles.metricValue}>
                <Text variant="bodySmall" weight="bold" color="primary" style={styles.metricValue}>
                  {formatNumber(planProgressCurrent, i18n.language)}
                </Text>
                {` / ${formatNumber(planProgressTarget, i18n.language)} ${t('common.units.day')}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayCopy}>
              <View style={styles.todayTitleRow}>
                <Text
                  variant="h3"
                  weight="bold"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.cardTitle}
                >
                  {t('statsScreen.todayProgress.title')}
                </Text>
                <Text variant="body">{STAT_EMOJIS.leaf}</Text>
              </View>
              <Text variant="bodySmall" color="secondary" style={styles.todaySubtitle}>
                {t('statsScreen.todayProgress.subtitle')}
              </Text>
            </View>
            <View style={styles.percentCopy}>
              <Text variant="h3" weight="bold" color="primary" style={styles.todayPercentText}>
                {`${todayProgressPercent}%`}
              </Text>
              <Text variant="caption" weight="semibold" style={styles.todayTargetText}>
                {`${formatNumber(consumedCalories, i18n.language)} / ${formatNumber(
                  targetCalories,
                  i18n.language
                )} ${t('statsScreen.calUnit')}`}
              </Text>
            </View>
          </View>

          <ProgressBar value={todayProgressPercent} size="sm" colorScheme="success" />

          <View style={styles.calorieHighlight}>
            <View style={styles.roundEmoji}>
              <Text variant="body">{STAT_EMOJIS.fire}</Text>
            </View>
            <View>
              <Text variant="h3" weight="bold" style={styles.calorieValue}>
                {formatNumber(consumedCalories, i18n.language)}
              </Text>
              <Text variant="caption" color="secondary" style={styles.calorieLabel}>
                {t('statsScreen.metrics.caloriesConsumed')}
              </Text>
            </View>
          </View>

          <View style={styles.todayMetricRow}>
            <SmallStat
              iconName="golf-outline"
              value={targetCalories}
              label={t('statsScreen.metrics.calorieTarget')}
              tint={theme.colors.state.infoBg}
              iconColor={theme.colors.state.info}
              locale={i18n.language}
              unit={t('statsScreen.calUnit')}
            />
            <View style={styles.verticalDivider} />
            <SmallStat
              iconName="flag-outline"
              value={remainingCalories}
              label={t('statsScreen.metrics.remainingCalories')}
              tint={theme.colors.state.warningBg}
              iconColor={theme.colors.state.warning}
              locale={i18n.language}
              unit={t('statsScreen.calUnit')}
            />
          </View>
        </View>

        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeader}>
            <View style={styles.nutritionCopy}>
              <View style={styles.nutritionTitleRow}>
                <Text
                  variant="h3"
                  weight="bold"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.cardTitle}
                >
                  {t('statsScreen.macros.title')}
                </Text>
                <Text variant="body">{STAT_EMOJIS.leaf}</Text>
              </View>
              <Text variant="bodySmall" color="secondary" style={styles.nutritionSubtitle}>
                {t('statsScreen.macros.subtitle')}
              </Text>
            </View>
            <Text variant="h3" style={styles.foodEmojiRow}>
              {`${STAT_EMOJIS.salmon}${STAT_EMOJIS.avocado}${STAT_EMOJIS.rice}`}
            </Text>
          </View>

          <View style={styles.nutritionDivider} />

          <View style={styles.macroGrid}>
            {macroStats.map((macro, index) => (
              <View
                key={macro.key}
                style={[styles.macroItem, index > 0 ? styles.macroItemDivider : null]}
              >
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                  <Text variant="caption" style={styles.macroLabel}>
                    {macro.label}
                  </Text>
                </View>
                <View style={styles.macroNumbers}>
                  <Text variant="caption" color="secondary" style={styles.macroValueText}>
                    {`${formatNumber(macro.value, i18n.language)}${t(
                      'common.units.gram'
                    )} / ${formatNumber(macro.target, i18n.language)}${t('common.units.gram')}`}
                  </Text>
                  <Text variant="caption" weight="semibold" style={styles.macroValueText}>
                    {`${macro.percent}%`}
                  </Text>
                </View>
                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroFill,
                      { width: `${macro.percent}%`, backgroundColor: macro.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <CaloriesTrendCard
          data={lineData}
          locale={i18n.language}
          mode={trendMode}
          modeOptions={trendModeOptions}
          title={t('statsScreen.trends.title')}
          unitLabel={t('common.units.kcal')}
          onModeChange={handleTrendModeChange}
        />

        <NutritionDistributionCard
          data={stackedMacroData}
          locale={i18n.language}
          mode={macroTrendMode}
          modeOptions={trendModeOptions}
          proteinLabel={t('statsScreen.macros.protein')}
          carbsLabel={t('statsScreen.macros.carbs')}
          fatLabel={t('statsScreen.macros.fat')}
          title={t('statsScreen.chartDistributionTitle')}
          unitLabel={t('common.units.gram')}
          onModeChange={handleMacroTrendModeChange}
        />

        <StatsSummaryCard
          averageCalories={monthSummary.averageCalories}
          locale={i18n.language}
          targetCalories={monthSummary.targetCalories}
          totalCalories={monthSummary.totalCalories}
          kcalUnit={t('common.units.kcal')}
          totalLabel={t('statsScreen.chartSummary.totalCalories')}
          averageLabel={t('statsScreen.chartSummary.dailyAverage')}
          targetLabel={t('statsScreen.chartSummary.target')}
          monthLabel={t('statsScreen.chartSummary.thisMonth')}
          perDayLabel={t('statsScreen.chartSummary.perDay')}
        />
      </View>
    </ScreenContainer>
  );
}

function SmallStat({
  iconName,
  value,
  label,
  tint,
  iconColor,
  locale,
  unit,
}: {
  iconName: ComponentProps<typeof Icon>['name'];
  value: number;
  label: string;
  tint: string;
  iconColor: string;
  locale: string;
  unit: string;
}) {
  return (
    <View style={styles.smallStat}>
      <View style={[styles.smallStatIcon, { backgroundColor: tint }]}>
        <Icon name={iconName} color={iconColor} size={18} />
      </View>
      <View style={styles.smallStatCopy}>
        <View style={styles.smallStatValueRow}>
          <Text variant="h3" weight="bold" style={styles.smallStatValue}>
            {formatNumber(value, locale)}
          </Text>
          <View style={styles.unitPill}>
            <Text variant="caption" color="primary" weight="semibold">
              {unit}
            </Text>
          </View>
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.smallStatLabel}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function CaloriesTrendCard({
  data,
  locale,
  mode,
  modeOptions,
  title,
  unitLabel,
  onModeChange,
}: {
  data: Array<{ label: string; value: number }>;
  locale: string;
  mode: TrendMode;
  modeOptions: Array<{ label: string; value: string }>;
  title: string;
  unitLabel: string;
  onModeChange: (value: string) => void;
}) {
  const { theme } = useUnistyles();
  const pointSpacing = hs(58);
  const chartWidth = Math.max(hs(314), hs(42) + hs(8) + data.length * pointSpacing);
  const chartHeight = vs(250);
  const plotLeft = hs(34);
  const plotRight = hs(8);
  const plotTop = vs(34);
  const plotBottom = vs(38);
  const plotWidth = chartWidth - plotLeft - plotRight;
  const plotHeight = chartHeight - plotTop - plotBottom;
  const maxValue = Math.max(
    600,
    Math.ceil(Math.max(...data.map((point) => point.value), 1) / 200) * 200
  );
  const sectionValues = [maxValue, Math.round((maxValue * 2) / 3), Math.round(maxValue / 3), 0];
  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;
  const points = data.map((point, index) => ({
    ...point,
    x: plotLeft + index * xStep,
    y: plotTop + plotHeight - (point.value / maxValue) * plotHeight,
  }));
  const linePath = createSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${plotTop + plotHeight} L ${
          points[0].x
        } ${plotTop + plotHeight} Z`
      : '';

  return (
    <View style={styles.statsChartCard}>
      <View style={styles.statsChartHeader}>
        <Text variant="h3" weight="bold" style={styles.statsChartTitle}>
          {title}
        </Text>
        <View style={styles.statsSegmentWrap}>
          <SegmentedControl value={mode} onChange={onModeChange} options={modeOptions} size="sm" />
        </View>
      </View>

      <View style={styles.axisUnitWrap}>
        <Text variant="caption" color="secondary">
          {unitLabel}
        </Text>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScrollContent}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="calorieArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.brand.primary} stopOpacity="0.32" />
              <Stop offset="1" stopColor={theme.colors.brand.primary} stopOpacity="0.03" />
            </LinearGradient>
          </Defs>

          {sectionValues.map((value) => {
            const y = plotTop + plotHeight - (value / maxValue) * plotHeight;
            return (
              <G key={value}>
                <Line
                  x1={plotLeft}
                  x2={plotLeft + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={theme.colors.border.default}
                  strokeDasharray="6 6"
                  strokeWidth={1}
                />
                <SvgText
                  x={0}
                  y={y + 4}
                  fill={theme.colors.text.secondary}
                  fontSize={theme.fonts.size.xs}
                >
                  {formatNumber(value, locale)}
                </SvgText>
              </G>
            );
          })}

          <Line
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotTop + plotHeight}
            stroke={theme.colors.border.default}
            strokeWidth={1}
          />
          <Line
            x1={plotLeft}
            x2={plotLeft + plotWidth}
            y1={plotTop + plotHeight}
            y2={plotTop + plotHeight}
            stroke={theme.colors.border.default}
            strokeWidth={1}
          />
          {areaPath ? <Path d={areaPath} fill="url(#calorieArea)" /> : null}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={theme.colors.brand.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ) : null}

          {points.map((point) => (
            <G key={`${point.label}-${point.x}`}>
              <Circle cx={point.x} cy={point.y} r={4} fill={theme.colors.brand.primary} />
              <SvgText
                x={point.x}
                y={Math.max(plotTop + 12, point.y - 14)}
                fill={theme.colors.brand.primary}
                fontSize={theme.fonts.size.sm}
                fontWeight="700"
                textAnchor="middle"
              >
                {formatNumber(point.value, locale)}
              </SvgText>
              <SvgText
                x={point.x}
                y={chartHeight - 6}
                fill={theme.colors.text.secondary}
                fontSize={theme.fonts.size.xs}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            </G>
          ))}
        </Svg>
      </ScrollView>
    </View>
  );
}

function NutritionDistributionCard({
  data,
  locale,
  mode,
  modeOptions,
  proteinLabel,
  carbsLabel,
  fatLabel,
  title,
  unitLabel,
  onModeChange,
}: {
  data: Array<{
    label: string;
    proteinValue: number;
    carbsValue: number;
    fatValue: number;
  }>;
  locale: string;
  mode: TrendMode;
  modeOptions: Array<{ label: string; value: string }>;
  proteinLabel: string;
  carbsLabel: string;
  fatLabel: string;
  title: string;
  unitLabel: string;
  onModeChange: (value: string) => void;
}) {
  const { theme } = useUnistyles();
  const barSlotWidth = hs(58);
  const chartWidth = Math.max(hs(314), hs(42) + hs(8) + data.length * barSlotWidth);
  const chartHeight = vs(246);
  const plotLeft = hs(34);
  const plotRight = hs(8);
  const plotTop = vs(26);
  const plotBottom = vs(36);
  const plotWidth = chartWidth - plotLeft - plotRight;
  const plotHeight = chartHeight - plotTop - plotBottom;
  const totals = data.map((item) => item.proteinValue + item.carbsValue + item.fatValue);
  const activeIndex = Math.max(
    0,
    totals.reduce((lastIndex, value, index) => (value > 0 ? index : lastIndex), -1)
  );
  const maxValue = Math.max(120, Math.ceil(Math.max(...totals, 1) / 30) * 30);
  const sectionValues = [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0,
  ];
  const xStep = data.length > 1 ? plotWidth / data.length : plotWidth;
  const barWidth = hs(28);
  const totalPillWidth = hs(44);
  const totalPillHeight = vs(24);
  const totalPillRadius = hs(10);

  return (
    <View style={styles.statsChartCard}>
      <View style={styles.statsChartHeader}>
        <View style={styles.headerCopy}>
          <Text variant="h3" weight="bold" style={styles.statsChartTitle}>
            {title}
          </Text>
          <View style={styles.chartLegendRow}>
            <LegendDot label={proteinLabel} color={theme.colors.state.info} />
            <LegendDot label={carbsLabel} color={theme.colors.state.warning} />
            <LegendDot label={fatLabel} color={theme.colors.brand.primary} />
          </View>
        </View>
        <View style={styles.statsSegmentWrap}>
          <SegmentedControl value={mode} onChange={onModeChange} options={modeOptions} size="sm" />
        </View>
      </View>

      <View style={styles.axisUnitWrap}>
        <Text variant="caption" color="secondary">
          {`(${unitLabel})`}
        </Text>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartScrollContent}
      >
        <Svg width={chartWidth} height={chartHeight}>
          {sectionValues.map((value) => {
            const y = plotTop + plotHeight - (value / maxValue) * plotHeight;
            return (
              <G key={value}>
                <Line
                  x1={plotLeft}
                  x2={plotLeft + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={theme.colors.border.default}
                  strokeDasharray="6 6"
                  strokeWidth={1}
                />
                <SvgText
                  x={0}
                  y={y + 4}
                  fill={theme.colors.text.secondary}
                  fontSize={theme.fonts.size.xs}
                >
                  {formatNumber(value, locale)}
                </SvgText>
              </G>
            );
          })}

          <Line
            x1={plotLeft}
            x2={plotLeft}
            y1={plotTop}
            y2={plotTop + plotHeight}
            stroke={theme.colors.border.default}
            strokeWidth={1}
          />
          <Line
            x1={plotLeft}
            x2={plotLeft + plotWidth}
            y1={plotTop + plotHeight}
            y2={plotTop + plotHeight}
            stroke={theme.colors.border.default}
            strokeWidth={1}
          />

          {data.map((item, index) => {
            const total = totals[index];
            const x = plotLeft + xStep * index + xStep / 2 - barWidth / 2;
            const active = index === activeIndex && total > 0;
            const proteinHeight = (item.proteinValue / maxValue) * plotHeight;
            const carbsHeight = (item.carbsValue / maxValue) * plotHeight;
            const fatHeight = (item.fatValue / maxValue) * plotHeight;
            let segmentY = plotTop + plotHeight;

            if (!active) {
              return (
                <G key={item.label}>
                  <Rect
                    x={x}
                    y={plotTop + plotHeight - vs(100)}
                    width={barWidth}
                    height={vs(100)}
                    rx={12}
                    fill={theme.colors.background.section}
                    opacity={0.76}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - 6}
                    fill={theme.colors.text.secondary}
                    fontSize={theme.fonts.size.xs}
                    textAnchor="middle"
                  >
                    {item.label}
                  </SvgText>
                </G>
              );
            }

            segmentY -= proteinHeight;
            const proteinY = segmentY;
            segmentY -= carbsHeight;
            const carbsY = segmentY;
            segmentY -= fatHeight;
            const fatY = segmentY;
            const totalPillY = Math.max(plotTop, fatY - totalPillHeight - vs(8));

            return (
              <G key={item.label}>
                <Rect
                  x={x + barWidth / 2 - totalPillWidth / 2}
                  y={totalPillY}
                  width={totalPillWidth}
                  height={totalPillHeight}
                  rx={totalPillRadius}
                  fill={theme.colors.background.surface}
                  stroke={theme.colors.border.subtle}
                  strokeWidth={1}
                />
                <SvgText
                  x={x + barWidth / 2}
                  y={totalPillY + totalPillHeight / 2 + 4}
                  fill={theme.colors.text.primary}
                  fontSize={theme.fonts.size.xs}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {`${formatNumber(total, locale)} ${unitLabel}`}
                </SvgText>
                {fatHeight > 0 ? (
                  <Path
                    d={createStackSegmentPath({
                      x,
                      y: fatY,
                      width: barWidth,
                      height: fatHeight,
                      radius: 12,
                      roundTop: true,
                      roundBottom: false,
                    })}
                    fill={theme.colors.brand.primary}
                  />
                ) : null}
                <Rect
                  x={x}
                  y={carbsY}
                  width={barWidth}
                  height={carbsHeight}
                  fill={theme.colors.state.warning}
                />
                {proteinHeight > 0 ? (
                  <Path
                    d={createStackSegmentPath({
                      x,
                      y: proteinY,
                      width: barWidth,
                      height: proteinHeight,
                      radius: 12,
                      roundTop: false,
                      roundBottom: true,
                    })}
                    fill={theme.colors.state.info}
                  />
                ) : null}
                <SvgText
                  x={x + barWidth / 2}
                  y={proteinY + proteinHeight / 2 + 4}
                  fill={theme.colors.text.inverse}
                  fontSize={theme.fonts.size.xs}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {formatNumber(item.proteinValue, locale)}
                </SvgText>
                <SvgText
                  x={x + barWidth / 2}
                  y={carbsY + carbsHeight / 2 + 4}
                  fill={theme.colors.text.inverse}
                  fontSize={theme.fonts.size.xs}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {formatNumber(item.carbsValue, locale)}
                </SvgText>
                <SvgText
                  x={x + barWidth / 2}
                  y={fatY + fatHeight / 2 + 4}
                  fill={theme.colors.text.inverse}
                  fontSize={theme.fonts.size.xs}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {formatNumber(item.fatValue, locale)}
                </SvgText>
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight - 6}
                  fill={theme.colors.text.secondary}
                  fontSize={theme.fonts.size.xs}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.chartLegendItem}>
      <View style={[styles.chartLegendDot, { backgroundColor: color }]} />
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

function StatsSummaryCard({
  averageCalories,
  locale,
  targetCalories,
  totalCalories,
  kcalUnit,
  totalLabel,
  averageLabel,
  targetLabel,
  monthLabel,
  perDayLabel,
}: {
  averageCalories: number;
  locale: string;
  targetCalories: number;
  totalCalories: number;
  kcalUnit: string;
  totalLabel: string;
  averageLabel: string;
  targetLabel: string;
  monthLabel: string;
  perDayLabel: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <SummaryMetric
        iconName="flame"
        iconVariant="primary"
        label={totalLabel}
        meta={monthLabel}
        value={`${formatNumber(totalCalories, locale)} ${kcalUnit}`}
      />
      <SummaryMetric
        iconName="trending-up"
        iconVariant="secondary"
        label={averageLabel}
        meta={monthLabel}
        value={`${formatNumber(averageCalories, locale)} ${kcalUnit}`}
      />
      <SummaryMetric
        iconName="radio-button-on"
        iconVariant="accent"
        label={targetLabel}
        meta={perDayLabel}
        value={`${formatNumber(targetCalories, locale)} ${kcalUnit}`}
      />
    </View>
  );
}

function SummaryMetric({
  iconName,
  iconVariant,
  label,
  meta,
  value,
}: {
  iconName: ComponentProps<typeof Icon>['name'];
  iconVariant: ComponentProps<typeof Icon>['variant'];
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetric}>
      <View style={styles.summaryIcon}>
        <Icon name={iconName} variant={iconVariant} size={22} />
      </View>
      <View style={styles.summaryCopy}>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {label}
        </Text>
        <Text
          variant="bodySmall"
          weight="bold"
          color={iconVariant === 'accent' ? 'accent' : 'primary'}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  cardTitle: {
    fontSize: theme.fonts.size.lg,
    lineHeight: theme.fonts.size['2xl'],
  },
  metricLabel: {
    fontSize: theme.fonts.size.xs,
    lineHeight: theme.fonts.size.md,
  },
  metricValue: {
    fontSize: theme.fonts.size.sm,
    lineHeight: theme.fonts.size.lg,
  },
  planCard: {
    minHeight: vs(168),
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  goalImage: {
    width: hs(82),
    height: hs(82),
  },
  planCopy: {
    flex: 1,
    minWidth: hs(128),
    gap: theme.metrics.spacingV.p4,
  },
  cardSubtitle: {
    fontSize: theme.fonts.size.sm,
    lineHeight: theme.fonts.size.lg,
  },
  circlePercentText: {
    fontSize: theme.fonts.size['2xl'],
    lineHeight: theme.fonts.size['3xl'],
  },
  circleProgress: {
    width: hs(88),
    alignItems: 'center',
  },
  circleTrack: {
    width: hs(84),
    height: hs(84),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hs(10),
    borderColor: theme.colors.background.section,
  },
  circleCap: {
    position: 'absolute',
    top: -hs(10),
    width: hs(30),
    height: hs(10),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
  },
  planMetrics: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  planMetric: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  planDivider: {
    width: 1,
    height: '80%',
    backgroundColor: theme.colors.border.default,
  },
  todayCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p16,
  },
  todayCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
    minWidth: 0,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  todaySubtitle: {
    maxWidth: hs(220),
    fontSize: theme.fonts.size.sm,
    lineHeight: theme.fonts.size.lg,
  },
  percentCopy: {
    alignItems: 'flex-end',
    gap: theme.metrics.spacingV.p4,
    minWidth: hs(84),
  },
  todayPercentText: {
    fontSize: theme.fonts.size.xl,
    lineHeight: theme.fonts.size['2xl'],
  },
  todayTargetText: {
    fontSize: theme.fonts.size.xs,
    lineHeight: theme.fonts.size.md,
  },
  calorieHighlight: {
    minHeight: vs(70),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.state.successBg,
  },
  roundEmoji: {
    width: hs(44),
    height: hs(44),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  calorieValue: {
    fontSize: theme.fonts.size.lg,
    lineHeight: theme.fonts.size['2xl'],
  },
  calorieLabel: {
    fontSize: theme.fonts.size.xs,
    lineHeight: theme.fonts.size.md,
  },
  todayMetricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p8,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: theme.colors.border.default,
  },
  smallStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p8,
    minWidth: 0,
  },
  smallStatIcon: {
    width: hs(30),
    height: hs(30),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallStatCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    minWidth: 0,
  },
  smallStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p4,
  },
  smallStatValue: {
    fontSize: theme.fonts.size.lg,
    lineHeight: theme.fonts.size['2xl'],
    flexShrink: 1,
  },
  smallStatLabel: {
    fontSize: theme.fonts.size.xxs,
    lineHeight: theme.fonts.size.sm,
    flexShrink: 1,
  },
  unitPill: {
    paddingHorizontal: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.sm,
    backgroundColor: theme.colors.state.successBg,
  },
  nutritionCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  chartCard: {
    gap: theme.metrics.spacingV.p16,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  segmentWrap: {
    minWidth: hs(140),
  },
  macroChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p20,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendList: {
    flex: 1,
    gap: theme.metrics.spacingV.p12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  legendCopy: {
    flex: 1,
  },
  emptyChart: {
    minHeight: vs(160),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  chartWrap: {
    overflow: 'hidden',
  },
  statsChartCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  statsChartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  statsChartTitle: {
    fontSize: theme.fonts.size.lg,
    lineHeight: theme.fonts.size['2xl'],
  },
  statsSegmentWrap: {
    width: hs(118),
  },
  axisUnitWrap: {
    minHeight: theme.fonts.size.md,
    justifyContent: 'center',
  },
  chartScrollContent: {
    paddingRight: theme.metrics.spacing.p8,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
    paddingTop: theme.metrics.spacingV.p8,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  chartLegendDot: {
    width: hs(8),
    height: hs(8),
    borderRadius: theme.metrics.borderRadius.full,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: theme.colors.shadow.elevation,
  },
  summaryMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    minWidth: 0,
  },
  summaryIcon: {
    width: hs(40),
    height: hs(40),
    borderRadius: theme.metrics.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  summaryCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    minWidth: 0,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  nutritionCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
    minWidth: 0,
  },
  nutritionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  nutritionSubtitle: {
    maxWidth: hs(220),
    fontSize: theme.fonts.size.sm,
    lineHeight: theme.fonts.size.lg,
  },
  foodEmojiRow: {
    minWidth: hs(96),
    textAlign: 'right',
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: theme.colors.border.default,
  },
  macroGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: theme.metrics.spacingV.p4,
  },
  macroItem: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  macroItemDivider: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border.default,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  macroLabel: {
    fontSize: theme.fonts.size.xs,
    lineHeight: theme.fonts.size.md,
  },
  macroDot: {
    width: hs(8),
    height: hs(8),
    borderRadius: theme.metrics.borderRadius.full,
  },
  macroNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  macroValueText: {
    fontSize: theme.fonts.size.xxs,
    lineHeight: theme.fonts.size.sm,
  },
  macroTrack: {
    width: '100%',
    height: vs(6),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
}));

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BarChart, type stackDataItem } from 'react-native-gifted-charts';
import { useUnistyles } from 'react-native-unistyles';
import { IconButton, SegmentedControl, Text, useContentWidth } from '@/common/components';
import { formatWholeNumber, toLocale } from '@/features/food-log/utils/format';
import { addDays } from '@/features/goals/utils/weightGoal';
import { useCurrentDate } from '@/hooks';
import { hs, vs } from '@/theme/metrics';
import { formatDateKey } from '@/utils/date';
import { useCalorieChart } from '../../hooks/useCalorieChart';
import {
  getChartWeekStart,
  type CalorieChartBar,
  type CalorieChartRange,
} from '../../utils/calorieChart';
import { styles } from './CalorieChartCard.styles';

const RANGES = ['week', 'year'] as const satisfies readonly CalorieChartRange[];
/** Screen and card padding on both sides. */
const HORIZONTAL_CHROME = hs(72);
const Y_AXIS_WIDTH = hs(36);
const SECTIONS = 4;
/** Y-axis steps are a multiple of this many kcal. */
const STEP_ROUNDING = 250;
const MIN_MAX_KCAL = 1000;
const LEGEND = [
  { kind: 'carbs', labelKey: 'macros.carbs' },
  { kind: 'protein', labelKey: 'macros.protein' },
  { kind: 'fat', labelKey: 'macros.fat' },
  { kind: 'other', labelKey: 'buddy.calorieChart.other' },
  { kind: 'goal', labelKey: 'buddy.calorieChart.goal' },
] as const;

function isRange(value: string): value is CalorieChartRange {
  return RANGES.some((range) => range === value);
}

function toDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

/** Room above the tallest bar and the goal line, in steps that read well on the axis. */
function getMaxValue(bars: CalorieChartBar[], target: number) {
  const highest = Math.max(MIN_MAX_KCAL, target, ...bars.map((bar) => bar.kcal)) * 1.1;
  return Math.ceil(highest / SECTIONS / STEP_ROUNDING) * STEP_ROUNDING * SECTIONS;
}

/** Today, or this month, else the latest bar with a log; nothing when the period is empty. */
function getDefaultKey(bars: CalorieChartBar[], today: string) {
  const current = bars.find((bar) => bar.key === today || bar.key === today.slice(0, 7));
  if (current && current.loggedDays > 0) {
    return current.key;
  }
  return bars.filter((bar) => bar.loggedDays > 0).at(-1)?.key ?? current?.key ?? null;
}

/** Calories per day of a week or per month of a year, stacked by where they came from. */
export function CalorieChartCard() {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const width = useContentWidth();
  const locale = toLocale(i18n.language);
  const today = formatDateKey(useCurrentDate());
  const currentWeek = getChartWeekStart(today);
  const currentYear = Number(today.slice(0, 4));

  const [range, setRange] = useState<CalorieChartRange>('week');
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [year, setYear] = useState(currentYear);
  const [pickedKey, setPickedKey] = useState<string | null>(null);

  const anchor = range === 'week' ? weekStart : `${year}-01-01`;
  const chart = useCalorieChart(range, anchor, today);
  const bars = useMemo(() => chart?.bars ?? [], [chart]);
  const target = chart?.target ?? 0;
  const maxValue = getMaxValue(bars, target);

  const pickable = bars.find((bar) => bar.key === pickedKey && !bar.future);
  const selectedKey = pickable ? pickable.key : getDefaultKey(bars, today);
  const selected = bars.find((bar) => bar.key === selectedKey) ?? null;
  const selectedIndex = selected ? bars.indexOf(selected) : -1;

  const chartWidth = width - HORIZONTAL_CHROME - Y_AXIS_WIDTH;
  const slot = chartWidth / Math.max(bars.length, 1);
  const barWidth = Math.max(6, slot * (range === 'week' ? 0.55 : 0.6));
  const radius = Math.min(6, barWidth / 2);

  const isCurrentPeriod = range === 'week' ? weekStart >= currentWeek : year >= currentYear;
  const periodLabel =
    range === 'week'
      ? `${toDate(weekStart).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })} – ${toDate(
          addDays(weekStart, 6)
        ).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}`
      : String(year);

  const shiftPeriod = (direction: -1 | 1) => {
    setPickedKey(null);
    if (range === 'week') {
      setWeekStart((current) => addDays(current, 7 * direction));
    } else {
      setYear((current) => current + direction);
    }
  };

  const stackData = useMemo<stackDataItem[]>(
    () =>
      bars.map((bar) => {
        const label =
          range === 'week'
            ? toDate(bar.key).toLocaleDateString(locale, { weekday: 'short' })
            : String(Number(bar.key.slice(5, 7)));
        // Bottom to top; whichever stack ends the bar gets its rounded top.
        const stacks = [
          { value: bar.carbsKcal, color: theme.colors.state.info },
          { value: bar.proteinKcal, color: theme.colors.state.success },
          { value: bar.fatKcal, color: theme.colors.state.warning },
          { value: bar.otherKcal, color: theme.colors.text.muted },
        ].filter((stack) => stack.value > 0);

        return {
          label,
          // The chart reads the first stack of every bar, so an empty one keeps a zero stack.
          stacks:
            stacks.length > 0
              ? stacks.map((stack, index) =>
                  index === stacks.length - 1
                    ? { ...stack, borderTopLeftRadius: radius, borderTopRightRadius: radius }
                    : stack
                )
              : [{ value: 0, color: theme.colors.text.muted }],
          topLabelComponent:
            range === 'week' && bar.loggedDays > 0
              ? () => (
                  <Text variant="caption" color="secondary" style={styles.topLabel(slot)}>
                    {formatWholeNumber(bar.kcal, i18n.language)}
                  </Text>
                )
              : undefined,
        };
      }),
    [bars, i18n.language, locale, radius, range, slot, theme.colors]
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" weight="bold" style={styles.flex}>
          {t('buddy.calorieChart.title')}
        </Text>
        <IconButton
          icon="chevron-back"
          size="sm"
          onPress={() => shiftPeriod(-1)}
          accessibilityLabel={t(`buddy.calorieChart.previous.${range}`)}
        />
        <Text variant="bodySmall" weight="semibold" align="center" style={styles.periodLabel}>
          {periodLabel}
        </Text>
        <IconButton
          icon="chevron-forward"
          size="sm"
          disabled={isCurrentPeriod}
          onPress={() => shiftPeriod(1)}
          accessibilityLabel={t(`buddy.calorieChart.next.${range}`)}
        />
      </View>

      <SegmentedControl
        size="sm"
        value={range}
        onChange={(value) => {
          if (isRange(value)) {
            setPickedKey(null);
            setRange(value);
          }
        }}
        options={RANGES.map((value) => ({ value, label: t(`buddy.calorieChart.tabs.${value}`) }))}
      />

      {/* The chart cannot draw without bars; hold its place until this range loads. */}
      {bars.length === 0 ? (
        <View style={styles.chartPlaceholder} />
      ) : (
        <View style={styles.chart}>
          <BarChart
            // The animation keeps the old bar heights when the data changes; remount instead.
            key={`${range}:${anchor}:${bars.length}`}
            stackData={stackData}
            width={chartWidth}
            height={vs(180)}
            barWidth={barWidth}
            spacing={slot - barWidth}
            initialSpacing={(slot - barWidth) / 2}
            endSpacing={0}
            disableScroll
            maxValue={maxValue}
            noOfSections={SECTIONS}
            // Set explicitly: an empty period otherwise gets fractional labels ("750.0").
            yAxisLabelTexts={Array.from({ length: SECTIONS + 1 }, (_, index) =>
              String((maxValue / SECTIONS) * index)
            )}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={theme.colors.border.subtle}
            rulesColor={theme.colors.border.subtle}
            yAxisTextStyle={styles.axisText}
            xAxisLabelTextStyle={styles.axisText}
            labelWidth={Math.max(slot, hs(28))}
            showReferenceLine1={target > 0}
            referenceLine1Position={target}
            referenceLine1Config={{
              color: theme.colors.brand.primary,
              thickness: 1.5,
              dashWidth: 4,
              dashGap: 4,
            }}
            highlightEnabled={selectedIndex >= 0}
            highlightedBarIndex={selectedIndex}
            lowlightOpacity={0.4}
            onPress={(_item: stackDataItem, index: number) => {
              const bar = bars[index];
              if (bar && !bar.future) {
                setPickedKey(bar.key);
              }
            }}
            isAnimated
          />
        </View>
      )}

      {selected ? <BarDetail bar={selected} range={range} /> : null}

      <View style={styles.legend}>
        {LEGEND.map(({ kind, labelKey }) => (
          <View key={kind} style={styles.legendItem}>
            <View style={kind === 'goal' ? styles.goalMark : styles.dot(kind)} />
            <Text variant="caption" color="secondary">
              {t(labelKey)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** What the selected bar adds up to: calories, then grams of each macro. */
function BarDetail({ bar, range }: { bar: CalorieChartBar; range: CalorieChartRange }) {
  const { t, i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  const format = (value: number) => formatWholeNumber(value, i18n.language);
  const gram = t('common.units.gram');

  const title =
    range === 'week'
      ? toDate(bar.key).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'numeric',
        })
      : // "Tháng 11 2026" like the home header; capitalize would also turn "năm" into "Năm".
        `${toDate(`${bar.key}-01`).toLocaleDateString(locale, { month: 'long' })} ${bar.key.slice(0, 4)}`;

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <Text variant="bodySmall" weight="semibold" style={styles.detailTitle}>
          {title}
        </Text>
        {bar.loggedDays > 0 ? (
          <Text variant="bodySmall" weight="bold">
            {`${format(bar.kcal)} ${t('common.units.kcal')}`}
          </Text>
        ) : null}
      </View>
      {bar.loggedDays > 0 ? (
        <>
          {range === 'year' ? (
            <Text variant="caption" color="secondary">
              {t('buddy.calorieChart.monthAverage', { count: bar.loggedDays })}
            </Text>
          ) : null}
          <Text variant="caption" color="secondary">
            {[
              `${t('macros.carbs')} ${format(bar.carbsGrams)} ${gram}`,
              `${t('macros.protein')} ${format(bar.proteinGrams)} ${gram}`,
              `${t('macros.fat')} ${format(bar.fatGrams)} ${gram}`,
            ].join(' · ')}
          </Text>
        </>
      ) : (
        <Text variant="caption" color="secondary">
          {t('buddy.calorieChart.noLog')}
        </Text>
      )}
    </View>
  );
}

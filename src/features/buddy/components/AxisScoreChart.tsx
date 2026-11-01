import { useMemo } from 'react';
import { View } from 'react-native';
import { BarChart, type barDataItem } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useContentWidth } from '@/common/components';
import { toLocale } from '@/features/food-log/utils/format';
import { hs, vs } from '@/theme/metrics';
import { SCORE_BANDS } from '../constants/stats';
import type { AxisChartPoint, StatsRange } from '../utils/axisDetail';

/** Room the screen and card padding plus the y-axis labels take from the content width. */
const HORIZONTAL_CHROME = hs(96);
const Y_AXIS_WIDTH = hs(28);
/** Aim for about this many x-axis labels however many bars there are. */
const MAX_LABELS = 7;

export interface AxisScoreChartProps {
  points: AxisChartPoint[];
  range: StatsRange;
  language: string;
}

function formatLabel(dateKey: string, range: StatsRange, language: string) {
  const date = new Date(`${dateKey}T00:00:00`);

  return range === 'week'
    ? date.toLocaleDateString(toLocale(language), { weekday: 'short' })
    : date.toLocaleDateString(toLocale(language), { day: 'numeric', month: 'numeric' });
}

/** A day's (or a week's) score as a bar coloured by how close it came to 100. */
export function AxisScoreChart({ points, range, language }: AxisScoreChartProps) {
  const width = useContentWidth();
  const { theme } = useUnistyles();
  const chartWidth = width - HORIZONTAL_CHROME - Y_AXIS_WIDTH;
  const slot = chartWidth / Math.max(points.length, 1);
  const barWidth = Math.max(3, slot * 0.6);
  const labelEvery = Math.ceil(points.length / MAX_LABELS);

  const data = useMemo<barDataItem[]>(
    () =>
      points.map((point, index) => {
        const score = point.score ?? 0;
        let frontColor = theme.colors.state.error;

        if (point.isToday) {
          frontColor = theme.colors.text.muted;
        } else if (score >= SCORE_BANDS.good) {
          frontColor = theme.colors.state.success;
        } else if (score >= SCORE_BANDS.fair) {
          frontColor = theme.colors.state.warning;
        }

        return {
          value: score,
          frontColor,
          label: index % labelEvery === 0 ? formatLabel(point.date, range, language) : '',
        };
      }),
    [labelEvery, language, points, range, theme.colors]
  );

  return (
    <View style={styles.wrap}>
      <BarChart
        // The animation keeps the old bar heights when the data changes; remount instead.
        key={`${range}:${points.length}`}
        data={data}
        width={chartWidth}
        height={vs(160)}
        barWidth={barWidth}
        spacing={slot - barWidth}
        initialSpacing={(slot - barWidth) / 2}
        endSpacing={0}
        disableScroll
        maxValue={100}
        noOfSections={4}
        barBorderTopLeftRadius={Math.min(4, barWidth / 2)}
        barBorderTopRightRadius={Math.min(4, barWidth / 2)}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={theme.colors.border.subtle}
        rulesColor={theme.colors.border.subtle}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        labelWidth={Math.max(slot * labelEvery, hs(32))}
        isAnimated
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    overflow: 'hidden',
  },
  axisText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.metrics.fontSize.xs,
  },
}));

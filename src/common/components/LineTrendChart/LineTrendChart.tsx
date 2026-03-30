import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';
import { useUnistyles } from 'react-native-unistyles';
import { hs, vs } from '@/theme/metrics';
import { styles } from './LineTrendChart.styles';
import type { LineTrendChartProps } from './LineTrendChart.types';

export function LineTrendChart({ data, scrollEnabled = false }: LineTrendChartProps) {
  const { width } = useWindowDimensions();
  const { theme } = useUnistyles();

  const lineData = useMemo<lineDataItem[]>(
    () =>
      data.map((point) => ({
        label: point.label,
        value: point.value,
      })),
    [data]
  );

  const lineChartWidth = useMemo(() => {
    if (scrollEnabled) {
      return undefined;
    }

    return Math.max(width - hs(72), hs(320));
  }, [scrollEnabled, width]);

  const lineChartSpacing = useMemo(() => {
    if (scrollEnabled) {
      return 56;
    }

    if (lineData.length > 1) {
      const compactWidth = Math.max(width - hs(72), hs(320));
      return Math.max(42, compactWidth / lineData.length - 8);
    }

    return 64;
  }, [lineData.length, scrollEnabled, width]);

  const maxValue = useMemo(
    () => Math.max(100, ...lineData.map((item) => item.value ?? 0)),
    [lineData]
  );

  return (
    <View style={styles.chartWrap}>
      <LineChart
        data={lineData}
        areaChart
        height={vs(220)}
        overflowBottom={vs(12)}
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
        spacing={lineChartSpacing}
        xAxisLabelTexts={lineData.map((item) => String(item.label ?? ''))}
        xAxisLabelsHeight={56}
        xAxisLabelsVerticalShift={45}
        disableScroll={!scrollEnabled}
        showScrollIndicator={false}
        maxValue={maxValue}
      />
    </View>
  );
}

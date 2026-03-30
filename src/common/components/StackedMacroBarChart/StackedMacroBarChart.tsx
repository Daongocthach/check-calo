import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BarChart, type stackDataItem } from 'react-native-gifted-charts';
import { useUnistyles } from 'react-native-unistyles';
import { hs, vs } from '@/theme/metrics';
import { Text } from '../Text';
import { styles } from './StackedMacroBarChart.styles';
import type { StackedMacroBarChartProps } from './StackedMacroBarChart.types';

function createStackValueLabel(value: number) {
  return function StackValueLabel() {
    if (value <= 0) {
      return null;
    }

    return (
      <View style={styles.stackValueWrap}>
        <Text variant="caption" weight="semibold" color="inverse">
          {value}
        </Text>
      </View>
    );
  };
}

export function StackedMacroBarChart({
  data,
  proteinLabel,
  carbsLabel,
  fatLabel,
  gramUnit,
  scrollEnabled = false,
}: StackedMacroBarChartProps) {
  const { width } = useWindowDimensions();
  const { theme } = useUnistyles();

  const stackData = useMemo<stackDataItem[]>(
    () =>
      data.map((item) => ({
        label: item.label,
        borderRadius: 14,
        stacks: [
          {
            value: item.proteinValue,
            color: theme.colors.state.info,
            borderRadius: 14,
            innerBarComponent: createStackValueLabel(item.proteinValue),
          },
          {
            value: item.carbsValue,
            color: theme.colors.state.warning,
            borderRadius: 14,
            innerBarComponent: createStackValueLabel(item.carbsValue),
          },
          {
            value: item.fatValue,
            color: theme.colors.state.success,
            borderRadius: 14,
            innerBarComponent: createStackValueLabel(item.fatValue),
          },
        ],
      })),
    [data, theme.colors.state.info, theme.colors.state.success, theme.colors.state.warning]
  );

  const chartWidth = useMemo(() => {
    if (scrollEnabled) {
      return undefined;
    }

    return Math.max(width - hs(72), hs(320));
  }, [scrollEnabled, width]);

  const spacing = useMemo(() => {
    if (scrollEnabled) {
      return 34;
    }

    if (stackData.length > 1) {
      const compactWidth = Math.max(width - hs(72), hs(320));
      return Math.max(18, compactWidth / stackData.length - 18);
    }

    return 24;
  }, [scrollEnabled, stackData.length, width]);

  const maxValue = useMemo(
    () => Math.max(50, ...data.map((item) => item.proteinValue + item.carbsValue + item.fatValue)),
    [data]
  );

  return (
    <View style={styles.chartWrap}>
      <BarChart
        stackData={stackData}
        height={vs(220)}
        width={chartWidth}
        spacing={spacing}
        barWidth={28}
        initialSpacing={12}
        endSpacing={12}
        disableScroll={!scrollEnabled}
        showScrollIndicator={false}
        noOfSections={4}
        maxValue={maxValue}
        roundedTop
        roundedBottom
        barBorderRadius={14}
        stackBorderRadius={14}
        xAxisThickness={1}
        yAxisThickness={0}
        xAxisColor={theme.colors.border.subtle}
        rulesColor={theme.colors.border.subtle}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        xAxisLabelsHeight={40}
        xAxisLabelsVerticalShift={8}
        yAxisColor={theme.colors.border.subtle}
      />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.proteinDot]} />
          <Text variant="caption" color="secondary">{`${proteinLabel} (${gramUnit})`}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.carbsDot]} />
          <Text variant="caption" color="secondary">{`${carbsLabel} (${gramUnit})`}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.fatDot]} />
          <Text variant="caption" color="secondary">{`${fatLabel} (${gramUnit})`}</Text>
        </View>
      </View>
    </View>
  );
}

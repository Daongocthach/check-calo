import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components';
import type { CalorieRange, DailyCalorieGoalState } from '@/features/profile/utils/calorie';

export interface CalorieGaugeProps {
  consumed: number;
  target: number;
  /** Calories that count as on target; marked as a band along the arc. */
  range: CalorieRange;
  /** Whether the day is under, within or over the range; colours the bars and the label. */
  state: DailyCalorieGoalState;
  /** Rendered width; height is roughly half. Defaults to 260. */
  width?: number;
}

const BAR_COUNT = 26;
/** The arc runs a little past the range so going over stays visible. */
const SCALE_HEADROOM = 1.15;

/** Half-circle of radial bars that fill as calories are consumed, with the target band on top. */
export function CalorieGauge({ consumed, target, range, state, width = 260 }: CalorieGaugeProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const scaleMax = Math.max(target, range.max) * SCALE_HEADROOM;
  const ratio = scaleMax > 0 ? Math.min(1, consumed / scaleMax) : 0;
  const filledBars = Math.round(ratio * BAR_COUNT);
  const height = width / 2 + 12;
  const centerX = width / 2;
  const centerY = width / 2;
  const outerRadius = width / 2 - 10;
  const innerRadius = outerRadius - width * 0.13;
  const bandRadius = width / 2 - 3;
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const fillColor = {
    below_target: theme.colors.brand.primary,
    on_target: theme.colors.state.success,
    above_target: theme.colors.state.warning,
  }[state];
  let statusLabel = t('goalTracking.today.onTarget');

  if (state === 'below_target') {
    statusLabel = t('goalTracking.today.remaining', {
      value: numberFormat.format(Math.max(0, Math.round(target - consumed))),
    });
  } else if (state === 'above_target') {
    statusLabel = t('goalTracking.today.over', {
      value: numberFormat.format(Math.round(consumed - target)),
    });
  }

  const pointAt = (value: number, radius: number) => {
    const angle = Math.PI - (Math.min(value, scaleMax) / scaleMax) * Math.PI;
    return `${centerX + radius * Math.cos(angle)} ${centerY - radius * Math.sin(angle)}`;
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {scaleMax > 0 && range.max > range.min ? (
          <Path
            d={`M ${pointAt(range.min, bandRadius)} A ${bandRadius} ${bandRadius} 0 0 1 ${pointAt(range.max, bandRadius)}`}
            stroke={theme.colors.state.success}
            strokeOpacity={0.45}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {Array.from({ length: BAR_COUNT }, (_, index) => {
          const angle = Math.PI - (index / (BAR_COUNT - 1)) * Math.PI;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          return (
            <Line
              key={index}
              x1={centerX + innerRadius * cos}
              y1={centerY - innerRadius * sin}
              x2={centerX + outerRadius * cos}
              y2={centerY - outerRadius * sin}
              stroke={index < filledBars ? fillColor : theme.colors.border.default}
              strokeWidth={width * 0.034}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={styles.center}>
        <Text variant="h1" weight="bold">
          {numberFormat.format(Math.round(consumed))}
        </Text>
        <Text variant="bodySmall" weight="semibold" style={styles.status(state)}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  status: (state: DailyCalorieGoalState) => ({
    color: {
      below_target: theme.colors.text.secondary,
      on_target: theme.colors.state.success,
      above_target: theme.colors.state.warning,
    }[state],
  }),
}));

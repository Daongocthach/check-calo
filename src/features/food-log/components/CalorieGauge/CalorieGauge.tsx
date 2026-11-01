import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components';
import type { CalorieRange, DailyCalorieGoalState } from '@/features/profile/utils/calorie';

export interface CalorieGaugeProps {
  consumed: number;
  target: number;
  /** Calories that count as on target; the empty bars in this range are tinted green until over. */
  range: CalorieRange;
  /** Whether the day is under, within or over the range; colours the bars and the label. */
  state: DailyCalorieGoalState;
  /** Rendered width; height is roughly half. Defaults to 260. */
  width?: number;
  /** Fixed end of the scale, e.g. maintenance calories; 0 and this value are labelled under the ends. */
  maximumValue?: number;
  /** Optional label for a target preview outside the daily dashboard. */
  label?: string;
  /** Use the brand colour for a planned calorie target. */
  appearance?: 'status' | 'primary';
}

const BAR_COUNT = 26;
/** The arc runs a little past the range so going over stays visible. */
const SCALE_HEADROOM = 1.15;
/** Bars and the number run together; skipped when the system asks for reduced motion. */
const FILL_TIMING = { duration: 800, easing: Easing.out(Easing.cubic) };

const AnimatedLine = Animated.createAnimatedComponent(Line);

interface GaugeBarProps {
  index: number;
  /** Animated count of filled bars; a bar fades in as the count passes it. */
  filled: SharedValue<number>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
  idleStroke: string;
  idleOpacity: number;
  fillColor: string;
}

/** One radial bar: the idle line with the filled colour faded in on top. */
function GaugeBar({ index, filled, idleStroke, idleOpacity, fillColor, ...line }: GaugeBarProps) {
  const fillProps = useAnimatedProps(() => ({
    strokeOpacity: Math.min(1, Math.max(0, filled.value - index)),
  }));

  return (
    <>
      <Line {...line} stroke={idleStroke} strokeOpacity={idleOpacity} strokeLinecap="round" />
      <AnimatedLine {...line} stroke={fillColor} strokeLinecap="round" animatedProps={fillProps} />
    </>
  );
}

/** The consumed number, counting from its previous value in step with the bars. */
function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  const shown = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    shown.value = withTiming(value, FILL_TIMING);
  }, [value, shown]);

  useAnimatedReaction(
    () => Math.round(shown.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setDisplay)(current);
    }
  );

  return (
    <Text variant="h1" weight="bold">
      {format(display)}
    </Text>
  );
}

/** Half-circle of radial bars that fill as calories are consumed; bars in the target range are tinted. */
export function CalorieGauge({
  consumed,
  target,
  range,
  state,
  width = 260,
  maximumValue,
  label,
  appearance = 'status',
}: CalorieGaugeProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const scaleMax = maximumValue ?? Math.max(target, range.max) * SCALE_HEADROOM;
  const ratio = scaleMax > 0 ? Math.min(1, consumed / scaleMax) : 0;
  const filledBars = Math.round(ratio * BAR_COUNT);
  const filled = useSharedValue(0);
  const height = width / 2 + 12;
  const centerX = width / 2;
  const centerY = width / 2;
  const outerRadius = width / 2 - 10;
  const innerRadius = outerRadius - width * 0.13;
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const fillColor =
    appearance === 'primary'
      ? theme.colors.brand.primary
      : {
          below_target: theme.colors.brand.primary,
          on_target: theme.colors.state.success,
          above_target: theme.colors.state.warning,
        }[state];
  let statusLabel = t('goalTracking.today.onTarget');

  useEffect(() => {
    filled.value = withTiming(filledBars, FILL_TIMING);
  }, [filledBars, filled]);

  if (state === 'below_target') {
    statusLabel = t('goalTracking.today.remaining', {
      value: numberFormat.format(Math.max(0, Math.round(target - consumed))),
    });
  } else if (state === 'above_target') {
    statusLabel = t('goalTracking.today.over', {
      value: numberFormat.format(Math.round(consumed - target)),
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.dial}>
        <Svg width={width} height={height}>
          {Array.from({ length: BAR_COUNT }, (_, index) => {
            const position = index / (BAR_COUNT - 1);
            const angle = Math.PI - position * Math.PI;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const value = position * scaleMax;
            const isInRange = scaleMax > 0 && value >= range.min && value <= range.max;
            // Once over, the band would show past the fill (rounding, or older days judged by
            // the target alone), so it is dropped. Filled bars cover it anyway.
            const isTargetBand = isInRange && state !== 'above_target';
            const idleStroke =
              isTargetBand && appearance !== 'primary'
                ? theme.colors.state.success
                : theme.colors.border.default;

            return (
              <GaugeBar
                key={index}
                index={index}
                filled={filled}
                x1={centerX + innerRadius * cos}
                y1={centerY - innerRadius * sin}
                x2={centerX + outerRadius * cos}
                y2={centerY - outerRadius * sin}
                strokeWidth={width * 0.034}
                idleStroke={idleStroke}
                idleOpacity={isTargetBand ? 0.35 : 1}
                fillColor={fillColor}
              />
            );
          })}
        </Svg>
        <View style={styles.center}>
          <CountUp value={Math.round(consumed)} format={numberFormat.format} />
          <Text
            variant="bodySmall"
            weight="semibold"
            style={appearance === 'primary' ? styles.primaryLabel : styles.status(state)}
          >
            {label ?? statusLabel}
          </Text>
        </View>
      </View>
      {maximumValue ? (
        <View style={styles.endpoints(width)}>
          <Text variant="caption" color="secondary" align="center" style={styles.endpointLabel}>
            {numberFormat.format(0)}
          </Text>
          <Text variant="caption" color="secondary" align="center" style={styles.endpointLabel}>
            {numberFormat.format(Math.round(maximumValue))}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: 'center',
  },
  dial: {
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  endpoints: (width: number) => ({
    width,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.metrics.spacingV.p4,
  }),
  endpointLabel: { width: '20%' },
  primaryLabel: { color: theme.colors.brand.primary },
  status: (state: DailyCalorieGoalState) => ({
    color: {
      below_target: theme.colors.text.secondary,
      on_target: theme.colors.state.success,
      above_target: theme.colors.state.warning,
    }[state],
  }),
}));

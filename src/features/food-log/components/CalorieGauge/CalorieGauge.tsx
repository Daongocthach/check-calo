import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components';

export interface CalorieGaugeProps {
  consumed: number;
  target: number;
  /** Rendered width; height is roughly half. Defaults to 260. */
  width?: number;
}

const BAR_COUNT = 26;

/** Half-circle of radial bars that fill as calories are consumed. */
export function CalorieGauge({ consumed, target, width = 260 }: CalorieGaugeProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const ratio = target > 0 ? Math.min(1, consumed / target) : 0;
  const filledBars = Math.round(ratio * BAR_COUNT);
  const isOver = target > 0 && consumed > target;
  const height = width / 2 + 12;
  const centerX = width / 2;
  const centerY = width / 2;
  const outerRadius = width / 2 - 8;
  const innerRadius = outerRadius - width * 0.13;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {Array.from({ length: BAR_COUNT }, (_, index) => {
          const angle = Math.PI - (index / (BAR_COUNT - 1)) * Math.PI;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          let stroke = theme.colors.border.default;

          if (index < filledBars) {
            stroke = isOver ? theme.colors.state.error : theme.colors.brand.primary;
          }

          return (
            <Line
              key={index}
              x1={centerX + innerRadius * cos}
              y1={centerY - innerRadius * sin}
              x2={centerX + outerRadius * cos}
              y2={centerY - outerRadius * sin}
              stroke={stroke}
              strokeWidth={width * 0.034}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={styles.center}>
        <Text variant="h1" weight="bold">
          {Math.round(consumed)}
        </Text>
        <Text variant="bodySmall" color="secondary">
          {t('home.caloriesLabel')}
        </Text>
      </View>
      <View style={styles.scale}>
        <Text variant="caption" color="tertiary">
          {t('home.gaugeMin')}
        </Text>
        <Text variant="caption" color="tertiary">
          {t('home.gaugeMax')}
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
    bottom: theme.metrics.spacingV.p16,
    alignItems: 'center',
  },
  scale: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p8,
  },
}));

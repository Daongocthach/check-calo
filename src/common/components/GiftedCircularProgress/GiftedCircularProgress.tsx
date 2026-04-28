import { useMemo } from 'react';
import { View } from 'react-native';
import { PieChart, type pieDataItem } from 'react-native-gifted-charts';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { GiftedCircularProgressProps } from './GiftedCircularProgress.types';

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function GiftedCircularProgress({
  progress,
  size = 96,
  strokeWidth = 10,
  progressColor,
  trackColor,
  children,
  accessibilityLabel,
  style,
}: GiftedCircularProgressProps) {
  const { theme } = useUnistyles();
  const clampedProgress = clampProgress(progress);
  const radius = size / 2;
  const innerRadius = Math.max(0, radius - strokeWidth);
  const safeProgressColor = progressColor ?? theme.colors.brand.primary;
  const safeTrackColor = trackColor ?? theme.colors.background.section;

  const chartData = useMemo<pieDataItem[]>(
    () => [
      {
        value: clampedProgress,
        color: safeProgressColor,
      },
      {
        value: 100 - clampedProgress,
        color: safeTrackColor,
      },
    ],
    [clampedProgress, safeProgressColor, safeTrackColor]
  );

  return (
    <View
      style={[styles.container, style, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clampedProgress }}
    >
      <PieChart
        data={chartData}
        donut
        radius={radius}
        innerRadius={innerRadius}
        initialAngle={-90}
        strokeWidth={0}
        innerCircleColor={theme.colors.background.surface}
        isAnimated
        animationDuration={450}
        centerLabelComponent={() =>
          children ? <View style={styles.content}>{children}</View> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

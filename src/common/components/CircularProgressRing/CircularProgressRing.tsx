import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';
import type { CircularProgressRingProps } from './CircularProgressRing.types';

export function CircularProgressRing({
  progress,
  size = 96,
  strokeWidth = 10,
  trackColor,
  progressColor,
  capColor = progressColor,
  children,
  accessibilityLabel,
  style,
  contentStyle,
  showCap = true,
}: CircularProgressRingProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress / 100);
  const capWidth = strokeWidth * 3.4;
  const capHeight = strokeWidth;

  return (
    <View
      style={[styles.container, style, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: clampedProgress }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {showCap ? (
        <View
          style={[
            styles.cap,
            {
              top: -strokeWidth,
              width: capWidth,
              height: capHeight,
              marginLeft: -capWidth / 2,
              backgroundColor: capColor,
              borderRadius: capHeight / 2,
            },
          ]}
        />
      ) : null}

      {children ? <View style={[styles.content, contentStyle]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cap: {
    position: 'absolute',
    left: '50%',
  },
  content: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

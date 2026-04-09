import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import type { IconProps } from '@/common/components/Icon';

interface MacroGoalCardProps {
  current: number;
  target: number;
  label: string;
  iconName: IconProps['name'];
  iconColor: string;
  ringColor: string;
  ringTrackColor: string;
}

export function MacroGoalCard({
  current,
  target,
  label,
  iconName,
  iconColor,
  ringColor,
  ringTrackColor,
}: MacroGoalCardProps) {
  const size = 96;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isOverTarget = target > 0 && current > target;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringTrackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        <View style={styles.center}>
          <Icon name={iconName} size={18} color={iconColor} />
          <Text variant="bodySmall" weight="semibold" align="center">
            {label}
          </Text>
          <Text
            variant="caption"
            color="secondary"
            align="center"
            style={isOverTarget ? styles.targetExceededText : undefined}
          >
            {`${Math.round(current)}/${Math.round(target)}g`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  targetExceededText: {
    color: theme.colors.state.error,
  },
}));

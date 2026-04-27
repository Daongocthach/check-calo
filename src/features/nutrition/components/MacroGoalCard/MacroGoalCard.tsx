import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { CircularProgressRing, Icon, Text } from '@/common/components';
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
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const isOverTarget = target > 0 && current > target;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <CircularProgressRing
          progress={progress * 100}
          size={size}
          strokeWidth={strokeWidth}
          trackColor={ringTrackColor}
          progressColor={ringColor}
        >
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
        </CircularProgressRing>
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
  targetExceededText: {
    color: theme.colors.state.error,
  },
}));

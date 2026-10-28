import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import type { IconProps } from '@/common/components';
import type { DayStatus } from '../types';

type LoggedStatus = Exclude<DayStatus, 'empty'>;

const STATUS_ICONS: Record<
  LoggedStatus,
  { name: IconProps['name']; variant: NonNullable<IconProps['variant']> }
> = {
  on_target: { name: 'checkmark', variant: 'onBrand' },
  off_target: { name: 'flame', variant: 'accent' },
};

/** Small round badge: a check for an on-target day, a flame for a logged day. */
export function DayStatusBadge({
  status,
  style,
}: {
  status: LoggedStatus;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.badge,
        status === 'on_target' ? styles.badgeOnTarget : styles.badgeLogged,
        style,
      ]}
    >
      <Icon name={STATUS_ICONS[status].name} variant={STATUS_ICONS[status].variant} size={10} />
    </View>
  );
}

export interface DayStatusBubbleProps {
  label: string;
  status: DayStatus;
  /** Future days stay dashed and muted whatever their status. */
  future?: boolean;
  selected?: boolean;
  /** Brand-coloured bold label, used to mark today. */
  highlighted?: boolean;
}

/**
 * Round day marker shared by the dashboard week strip and the streak calendar: dashed when
 * nothing was logged, solid when logged, with a check (on target) or flame (logged) badge.
 */
export function DayStatusBubble({
  label,
  status,
  future = false,
  selected = false,
  highlighted = false,
}: DayStatusBubbleProps) {
  let textColor: 'inverse' | 'tertiary' | 'link' | 'primary' = 'primary';
  if (selected) {
    textColor = 'inverse';
  } else if (future) {
    textColor = 'tertiary';
  } else if (highlighted) {
    textColor = 'link';
  }

  return (
    <View>
      <View
        style={[
          styles.bubble,
          status === 'empty' || future ? styles.bubbleEmpty : styles.bubbleLogged,
          selected && styles.bubbleSelected,
        ]}
      >
        <Text variant="caption" weight={highlighted ? 'bold' : 'semibold'} color={textColor}>
          {label}
        </Text>
      </View>
      {status === 'empty' || future ? null : (
        <DayStatusBadge status={status} style={styles.badgeOnBubble} />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  bubble: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bubbleEmpty: {
    borderStyle: 'dashed',
    borderColor: theme.colors.border.strong,
  },
  // iOS keeps a previous dashed style unless solid is set explicitly.
  bubbleLogged: {
    borderStyle: 'solid',
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.surface,
  },
  bubbleSelected: {
    borderStyle: 'solid',
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary,
  },
  badge: {
    width: theme.metrics.spacing.p16,
    height: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.background.surface,
  },
  // Sits on the bubble's top-right edge so the label stays readable.
  badgeOnBubble: {
    position: 'absolute',
    top: -theme.metrics.spacing.p4,
    right: -theme.metrics.spacing.p4,
  },
  badgeOnTarget: {
    backgroundColor: theme.colors.state.success,
  },
  badgeLogged: {
    backgroundColor: theme.colors.state.warningBg,
  },
}));

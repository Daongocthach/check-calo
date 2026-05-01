import { View } from 'react-native';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';
import { STREAK_STATUS, type StreakStatus } from './Streak.constants';
import { styles } from './Streak.styles';
import type { StreakProps } from './Streak.types';

function getStatusLabel(status: StreakStatus) {
  switch (status) {
    case STREAK_STATUS.COMPLETED:
      return 'completed';
    case STREAK_STATUS.MISSED_GOAL:
      return 'missed goal';
    case STREAK_STATUS.NONE:
    default:
      return 'not completed';
  }
}

function getStatusIcon(status: StreakStatus) {
  switch (status) {
    case STREAK_STATUS.COMPLETED:
      return 'checkmark-outline' as const;
    case STREAK_STATUS.MISSED_GOAL:
      return 'close-outline' as const;
    default:
      return null;
  }
}

/**
 * Week streak tracker inspired by Duolingo.
 *
 * @example
 * ```tsx
 * <Streak
 *   title="This week"
 *   days={[1, 0, 1, 1, 1, 2, 1]}
 *   dayLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
 * />
 * ```
 */
export function Streak({ days, dayLabels, title, subtitle, style }: StreakProps) {
  const fallbackLabels = days.map((_, index) => `${index + 1}`);

  return (
    <View style={[styles.container, style]}>
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? (
            <Text variant="body" weight="semibold" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" color="secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.row}>
        {days.map((status, index) => {
          const label = dayLabels?.[index] ?? fallbackLabels[index] ?? `${index + 1}`;
          const iconName = getStatusIcon(status);
          const accessibilityLabel = `${label}: ${getStatusLabel(status)}`;

          return (
            <View key={`${label}-${index}`} style={styles.dayCell}>
              <View
                accessibilityRole="image"
                accessibilityLabel={accessibilityLabel}
                style={[
                  styles.statusCircle,
                  status === STREAK_STATUS.NONE && styles.statusCircleNone,
                  status === STREAK_STATUS.COMPLETED && styles.statusCircleCompleted,
                  status === STREAK_STATUS.MISSED_GOAL && styles.statusCircleMissed,
                ]}
              >
                {iconName ? (
                  <Icon name={iconName} size={16} variant="onBrand" />
                ) : (
                  <View style={styles.statusDot} />
                )}
              </View>
              <Text variant="caption" weight="semibold" color="secondary" style={styles.dayLabel}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

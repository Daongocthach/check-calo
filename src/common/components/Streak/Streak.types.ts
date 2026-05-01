import type { StyleProp, ViewStyle } from 'react-native';
import type { StreakStatus } from './Streak.constants';

export interface StreakProps {
  days: readonly StreakStatus[];
  dayLabels?: readonly string[];
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

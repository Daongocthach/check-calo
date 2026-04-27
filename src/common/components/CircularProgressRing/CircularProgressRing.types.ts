import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface CircularProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
  capColor?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  showCap?: boolean;
}

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface GiftedCircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  trackColor?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

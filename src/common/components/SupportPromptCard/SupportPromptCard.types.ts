import type { StyleProp, ViewStyle } from 'react-native';

export interface SupportPromptCardProps {
  message: string;
  actionLabel: string;
  onActionPress: () => void;
  onClosePress?: () => void;
  closeAccessibilityLabel?: string;
  dismissible?: boolean;
  style?: StyleProp<ViewStyle>;
}

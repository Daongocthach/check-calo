import type { TextColor } from '@/common/components/Text/Text.types';

/** Props for the {@link Loading} component. */
export interface LoadingProps {
  /** Optional text message displayed below the spinner. */
  message?: string;
  /** Semantic color for the optional message. Defaults to `'secondary'`. */
  messageColor?: TextColor;
  /** Whether the loading indicator should fill the entire screen. Defaults to `false`. */
  fullScreen?: boolean;
  /** Size of the activity indicator spinner. Defaults to `'large'`. */
  size?: 'small' | 'large';
  /** Custom accessibility label for the loading container. Defaults to the message or `'Loading'`. */
  accessibilityLabel?: string;
}

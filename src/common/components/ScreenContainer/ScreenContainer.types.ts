import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

/** Props for the {@link ScreenContainer} component. */
export interface ScreenContainerProps {
  /** Content to render inside the screen container. */
  children: ReactNode;
  /** Whether the container should be scrollable via a ScrollView. Defaults to `false`. */
  scrollable?: boolean;
  /** Whether to apply horizontal and vertical padding. Defaults to `true`. */
  padded?: boolean;
  /** Safe area edges to respect. Defaults to `['top']`. */
  edges?: ('top' | 'bottom')[];
  /** When set, renders a {@link ScreenHeader} with this title above the content. */
  title?: string;
  /** Subtitle forwarded to the header. */
  subtitle?: string;
  /** Right-side header element. */
  headerRight?: ReactNode;
  /** Additional styles applied to the container or scroll content. */
  style?: ViewStyle;
}

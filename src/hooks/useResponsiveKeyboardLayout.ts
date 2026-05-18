import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenDimensions } from './useScreenDimensions';

interface ResponsiveKeyboardLayoutOptions {
  /** Screen height below which the compact layout is used. Defaults to 700. */
  compactHeightThreshold?: number;
  /** Bottom offset used by keyboard-aware scroll view on compact screens. */
  compactKeyboardBottomOffset: number;
  /** Bottom offset used by keyboard-aware scroll view on regular screens. */
  regularKeyboardBottomOffset: number;
  /** Keyboard sticky offset when the keyboard is open on compact screens. */
  compactKeyboardOpenedOffset: number;
  /** Keyboard sticky offset when the keyboard is open on regular screens. */
  regularKeyboardOpenedOffset: number;
  /** Additional footer padding above the safe-area inset on compact screens. */
  compactFooterPadding: number;
  /** Additional footer padding above the safe-area inset on regular screens. */
  regularFooterPadding: number;
}

interface ResponsiveKeyboardLayoutResult {
  isCompactHeight: boolean;
  keyboardBottomOffset: number;
  footerBottomPadding: number;
  footerKeyboardOffset: {
    closed: number;
    opened: number;
  };
}

/**
 * Computes keyboard-friendly spacing values that adapt across small and large devices.
 *
 * This keeps the keyboard handling logic in one place so screens can stay simple.
 */
export function useResponsiveKeyboardLayout(
  options: ResponsiveKeyboardLayoutOptions
): ResponsiveKeyboardLayoutResult {
  const { height } = useScreenDimensions();
  const { bottom } = useSafeAreaInsets();
  const isCompactHeight = height < (options.compactHeightThreshold ?? 700);

  return {
    isCompactHeight,
    keyboardBottomOffset: isCompactHeight
      ? options.compactKeyboardBottomOffset
      : options.regularKeyboardBottomOffset,
    footerBottomPadding:
      bottom + (isCompactHeight ? options.compactFooterPadding : options.regularFooterPadding),
    footerKeyboardOffset: {
      closed: 0,
      opened: isCompactHeight
        ? options.compactKeyboardOpenedOffset
        : options.regularKeyboardOpenedOffset,
    },
  };
}

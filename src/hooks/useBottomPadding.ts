import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_RESERVED_HEIGHT } from '@/common/components/TabBar';
import { vs } from '@/theme/metrics';

const ANDROID_EXTRA = vs(12);
const SCREEN_BOTTOM_GAP = vs(16);

interface BottomPaddingOptions {
  /** Reserve space for the floating tab bar. Pass `false` on stack screens. Defaults to `true`. */
  withTabBar?: boolean;
}

export function useBottomPadding({ withTabBar = true }: BottomPaddingOptions = {}) {
  const { bottom } = useSafeAreaInsets();

  if (!withTabBar) {
    return bottom + SCREEN_BOTTOM_GAP;
  }

  const base = TAB_BAR_RESERVED_HEIGHT + bottom;

  return Platform.OS === 'android' ? base + ANDROID_EXTRA : base;
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vs } from '@/theme/metrics';

const SCREEN_BOTTOM_GAP = vs(16);

/** Bottom padding for scroll content: the home-indicator inset plus a small gap. */
export function useBottomPadding() {
  const { bottom } = useSafeAreaInsets();

  return bottom + SCREEN_BOTTOM_GAP;
}

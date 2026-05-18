import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_RESERVED_HEIGHT } from '@/common/components/TabBar';
import { vs } from '@/theme/metrics';

const ANDROID_EXTRA = vs(12);

export function useBottomPadding() {
  const { bottom } = useSafeAreaInsets();
  const base = TAB_BAR_RESERVED_HEIGHT + bottom;

  return Platform.OS === 'android' ? base + ANDROID_EXTRA : base;
}

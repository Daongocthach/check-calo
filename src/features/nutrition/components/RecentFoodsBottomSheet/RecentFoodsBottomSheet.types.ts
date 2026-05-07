import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { ReactNode, RefObject } from 'react';
import type { RecentFood } from '@/features/nutrition/types';

export interface RecentFoodsBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  recentFoods: RecentFood[];
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptySubtitle: string;
  closeAccessibilityLabel: string;
  renderRecentItem: (recent: RecentFood) => ReactNode;
  rightActions?: ReactNode;
  topInset?: number;
  onDismiss?: () => void;
  snapPoints?: Array<string | number>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

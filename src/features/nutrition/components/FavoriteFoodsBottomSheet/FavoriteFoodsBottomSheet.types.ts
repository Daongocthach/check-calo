import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { ReactNode, RefObject } from 'react';
import type { FavoriteFood } from '@/features/nutrition/types';

export interface FavoriteFoodsBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  favoriteFoods: FavoriteFood[];
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptySubtitle: string;
  closeAccessibilityLabel: string;
  renderFavoriteItem: (favorite: FavoriteFood) => ReactNode;
  rightActions?: ReactNode;
  topInset?: number;
  onDismiss?: () => void;
  snapPoints?: Array<string | number>;
}

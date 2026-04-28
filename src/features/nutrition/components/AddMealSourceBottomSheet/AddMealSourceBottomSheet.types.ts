import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { RefObject } from 'react';

export interface AddMealSourceBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheetModal | null>;
  topInset?: number;
  onManualPress: () => void;
  onPhotoPress: () => void;
  onLibraryPress: () => void;
  onBarcodePress: () => void;
  onViewAllRecentPress: () => void;
  onSheetChange?: (index: number) => void;
}

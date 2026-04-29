export interface AddMealSourceBottomSheetProps {
  onManualPress: () => void;
  onPhotoPress: () => void;
  onLibraryPress: () => void;
  onBarcodePress: () => void;
  onRecentFoodPress: (favoriteId: string) => void;
  onViewAllRecentPress: () => void;
}

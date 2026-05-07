export interface AddMealSourceBottomSheetProps {
  onManualPress: () => void;
  onPhotoPress: () => void;
  onLibraryPress: () => void;
  onBarcodePress: () => void;
  onRecentFoodPress: (recentId: string) => void;
  onViewAllRecentPress: () => void;
}

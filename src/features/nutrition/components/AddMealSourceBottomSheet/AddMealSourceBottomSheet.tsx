import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Icon, Loading, Text } from '@/common/components';
import { listFavoriteFoodsPage } from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import type { FavoriteFood } from '@/features/nutrition/types';
import { styles } from './AddMealSourceBottomSheet.styles';
import type { AddMealSourceBottomSheetProps } from './AddMealSourceBottomSheet.types';

type AddMealOptionTone = 'manual' | 'photo' | 'library' | 'barcode';
type IoniconsName = ComponentProps<typeof Icon>['name'];

interface RecentFoodChip {
  key: string;
  title: string;
  calories: string;
  imageUri: string | null;
}

const RECENT_FOOD_LIMIT = 4;

export function AddMealSourceBottomSheet({
  bottomSheetRef,
  topInset,
  onManualPress,
  onPhotoPress,
  onLibraryPress,
  onBarcodePress,
  onViewAllRecentPress,
  onSheetChange,
}: AddMealSourceBottomSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const sheetState = useAddMealSourceSheetStore((state) => state.sheetState);
  const [recentFoods, setRecentFoods] = useState<FavoriteFood[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [hasNextRecentPage, setHasNextRecentPage] = useState(false);
  const [isLoadingRecentFoods, setIsLoadingRecentFoods] = useState(false);
  const [isLoadingMoreRecentFoods, setIsLoadingMoreRecentFoods] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSelect = useCallback(
    (action: () => void) => {
      pendingActionRef.current = action;
      bottomSheetRef.current?.dismiss();
    },
    [bottomSheetRef]
  );

  const handleDismiss = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const loadRecentFoods = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setIsLoadingMoreRecentFoods(true);
    } else {
      setIsLoadingRecentFoods(true);
    }

    try {
      const result = await listFavoriteFoodsPage({
        page,
        pageSize: RECENT_FOOD_LIMIT,
      });
      setRecentFoods((current) => (append ? [...current, ...result.items] : result.items));
      setRecentPage(result.page);
      setHasNextRecentPage(result.hasNextPage);
    } catch {
      if (!append) {
        setRecentFoods([]);
      }
      setHasNextRecentPage(false);
    } finally {
      if (append) {
        setIsLoadingMoreRecentFoods(false);
      } else {
        setIsLoadingRecentFoods(false);
      }
    }
  }, []);

  useEffect(() => {
    if (sheetState !== 'opening') {
      return;
    }

    setRecentFoods([]);
    setRecentPage(1);
    setHasNextRecentPage(false);
    void loadRecentFoods(1, false);
  }, [loadRecentFoods, sheetState]);

  const handleLoadMoreRecentFoods = useCallback(() => {
    if (isLoadingRecentFoods || isLoadingMoreRecentFoods || !hasNextRecentPage) {
      return;
    }

    void loadRecentFoods(recentPage + 1, true);
  }, [
    hasNextRecentPage,
    isLoadingMoreRecentFoods,
    isLoadingRecentFoods,
    loadRecentFoods,
    recentPage,
  ]);

  const handleRecentFoodsScroll = useCallback(
    ({
      nativeEvent,
    }: {
      nativeEvent: {
        contentOffset: { x: number };
        contentSize: { width: number };
        layoutMeasurement: { width: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      const distanceFromEnd = contentSize.width - (contentOffset.x + layoutMeasurement.width);

      if (distanceFromEnd < 96) {
        handleLoadMoreRecentFoods();
      }
    },
    [handleLoadMoreRecentFoods]
  );

  const recentFoodChips = useMemo<RecentFoodChip[]>(
    () =>
      recentFoods.map((food) => ({
        key: food.id,
        title: food.name,
        calories: `${Math.round(food.totalCalories)} kcal`,
        imageUri: food.thumbnailUri ?? food.imageUri ?? null,
      })),
    [recentFoods]
  );

  let recentFoodsContent: ReactNode;

  if (isLoadingRecentFoods) {
    recentFoodsContent = (
      <View style={styles.recentLoadingState}>
        <Loading size="small" />
      </View>
    );
  } else if (recentFoodChips.length === 0) {
    recentFoodsContent = (
      <View style={styles.recentEmptyState}>
        <View style={styles.recentEmptyIcon}>
          <Icon name="restaurant-outline" size={22} variant="primary" />
        </View>
        <View style={styles.recentEmptyCopy}>
          <Text variant="bodySmall" weight="semibold">
            {t('addScreen.recent.emptyTitle')}
          </Text>
          <Text variant="caption" color="secondary">
            {t('addScreen.recent.emptySubtitle')}
          </Text>
        </View>
      </View>
    );
  } else {
    recentFoodsContent = (
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentList}
        onScroll={handleRecentFoodsScroll}
        scrollEventThrottle={16}
      >
        {recentFoodChips.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() =>
              handleSelect(() =>
                router.push({
                  pathname: '/food-detail',
                  params: {
                    favoriteId: item.key,
                  },
                })
              )
            }
            style={styles.recentChip}
          >
            <View style={styles.recentThumb}>
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.recentImage}
                  contentFit="cover"
                />
              ) : (
                <Icon name="image-outline" size={18} variant="primary" />
              )}
            </View>
            <View style={styles.recentCopy}>
              <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                {item.calories}
              </Text>
            </View>
          </Pressable>
        ))}
        {isLoadingMoreRecentFoods ? (
          <View style={styles.recentListFooter}>
            <Loading size="small" />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  const options = [
    {
      key: 'manual',
      titleKey: 'addScreen.captureModes.manual',
      descriptionKey: 'addScreen.modeContent.manual.sheetBody',
      iconName: 'add-circle-outline',
      onPress: onManualPress,
    },
    {
      key: 'photo',
      titleKey: 'addScreen.captureModes.scanFood',
      descriptionKey: 'addScreen.modeContent.scanFood.sheetBody',
      iconName: 'camera-outline',
      onPress: onPhotoPress,
    },
    {
      key: 'library',
      titleKey: 'addScreen.captureModes.library',
      descriptionKey: 'addScreen.modeContent.library.sheetBody',
      iconName: 'image-outline',
      onPress: onLibraryPress,
    },
    {
      key: 'barcode',
      titleKey: 'addScreen.captureModes.barcode',
      descriptionKey: 'addScreen.modeContent.barcode.sheetBody',
      iconName: 'barcode-outline',
      onPress: onBarcodePress,
    },
  ] as const;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['80%', '100%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      topInset={topInset}
      onChange={onSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + theme.metrics.spacingV.p32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text variant="h2" weight="bold">
                {t('addScreen.modalTitle')}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
                {t('addScreen.modalSubtitle')}
              </Text>
            </View>
            <View style={styles.sparkleGroup} pointerEvents="none">
              <Icon name="sparkles-outline" size={24} color={theme.colors.brand.primaryVariant} />
            </View>
          </View>

          <View style={styles.optionList}>
            {options.map((option) => (
              <AddMealSourceOption
                key={option.key}
                tone={option.key}
                title={t(option.titleKey)}
                description={t(option.descriptionKey)}
                iconName={option.iconName}
                onPress={() => handleSelect(option.onPress)}
              />
            ))}
          </View>

          <View style={styles.recentHeader}>
            <Text variant="body" weight="semibold">
              {t('addScreen.recent.title')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('addScreen.recent.viewAll')}
              onPress={() => handleSelect(onViewAllRecentPress)}
              style={styles.viewAllButton}
            >
              <Text variant="bodySmall" weight="semibold" color="primary">
                {t('addScreen.recent.viewAll')}
              </Text>
              <Icon name="chevron-forward" size={16} color={theme.colors.brand.primary} />
            </Pressable>
          </View>

          {recentFoodsContent}
        </BottomSheetView>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function AddMealSourceOption({
  tone,
  title,
  description,
  iconName,
  onPress,
}: {
  tone: AddMealOptionTone;
  title: string;
  description: string;
  iconName: IoniconsName;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  const optionStyleByTone = {
    manual: styles.optionManual,
    photo: styles.optionPhoto,
    library: styles.optionLibrary,
    barcode: styles.optionBarcode,
  };

  const iconColorByTone = {
    manual: theme.colors.state.success,
    photo: theme.colors.state.info,
    library: theme.colors.brand.primary,
    barcode: theme.colors.brand.tertiary,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.optionCard, optionStyleByTone[tone]]}
    >
      <View style={styles.optionIconWrap}>
        <Icon name={iconName} size={32} color={iconColorByTone[tone]} />
      </View>
      <View style={styles.optionCopy}>
        <Text variant="body" weight="semibold">
          {title}
        </Text>
        <Text variant="caption" color="secondary" style={styles.optionDescription}>
          {description}
        </Text>
      </View>
      <View style={styles.chevronWrap}>
        <Icon name="chevron-forward" size={24} variant="primary" />
      </View>
    </Pressable>
  );
}

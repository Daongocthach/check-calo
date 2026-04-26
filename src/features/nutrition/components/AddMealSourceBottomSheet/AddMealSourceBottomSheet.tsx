import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { listFavoriteFoodsPage } from '@/features/nutrition/services/nutritionDatabase';
import type { FavoriteFood } from '@/features/nutrition/types';
import { styles } from './AddMealSourceBottomSheet.styles';
import type { AddMealSourceBottomSheetProps } from './AddMealSourceBottomSheet.types';

type AddMealOptionTone = 'manual' | 'photo' | 'barcode';
type IoniconsName = ComponentProps<typeof Icon>['name'];

const RECENT_FOOD_LIMIT = 4;

export function AddMealSourceBottomSheet({
  bottomSheetRef,
  topInset,
  onManualPress,
  onPhotoPress,
  onBarcodePress,
  onViewAllRecentPress,
  onSheetChange,
}: AddMealSourceBottomSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [recentFoods, setRecentFoods] = useState<FavoriteFood[]>([]);
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

  const loadRecentFoods = useCallback(async () => {
    try {
      const result = await listFavoriteFoodsPage({
        page: 1,
        pageSize: RECENT_FOOD_LIMIT,
      });
      setRecentFoods(result.items);
    } catch {
      setRecentFoods([]);
    }
  }, []);

  useEffect(() => {
    void loadRecentFoods();
  }, [loadRecentFoods]);

  const recentFoodChips = useMemo(
    () =>
      recentFoods.map((food) => ({
        key: food.id,
        title: food.name,
        calories: `${Math.round(food.totalCalories)} kcal`,
        imageUri: food.thumbnailUri ?? food.imageUri ?? null,
      })),
    [recentFoods]
  );

  const options = [
    {
      key: 'manual',
      titleKey: 'addScreen.captureModes.manual',
      descriptionKey: 'addScreen.modeContent.manual.sheetBody',
      iconName: 'create-outline',
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
      snapPoints={['70%']}
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

          {recentFoodChips.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentFoodChips.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => handleSelect(onManualPress)}
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
                      <Icon name="restaurant-outline" size={18} variant="primary" />
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
            </ScrollView>
          ) : (
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
          )}
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
    barcode: styles.optionBarcode,
  };

  const iconColorByTone = {
    manual: theme.colors.state.success,
    photo: theme.colors.state.info,
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

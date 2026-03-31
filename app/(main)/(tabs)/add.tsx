import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, ScreenContainer, SearchBar, Text } from '@/common/components';
import { AddMealFoodCard } from '@/features/nutrition/components/AddMealFoodCard';
import {
  createFoodEntry,
  listFavoriteFoods,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealStore } from '@/features/nutrition/stores/useAddMealStore';
import type { FavoriteFood } from '@/features/nutrition/types';
import { formatMealWeight } from '@/features/nutrition/utils/quantity';
import { useAppAlert } from '@/providers/app-alert';
import { useOpenCamera, useOpenQrScanner } from '@/providers/camera';
import { hs } from '@/theme/metrics';
import { toast } from '@/utils/toast';

function toDraftMealFavoriteItem(favorite: FavoriteFood) {
  return {
    sourceKey: `favorite:${favorite.id}`,
    title: favorite.name,
    quantityLabel: favorite.quantityLabel,
    quantityGrams: favorite.quantityGrams,
    totalCalories: favorite.totalCalories,
    proteinGrams: favorite.proteinGrams,
    carbsGrams: favorite.carbsGrams,
    fatGrams: favorite.fatGrams,
    notes: favorite.notes,
    imageUri: favorite.imageUri ?? null,
  };
}

export default function AddCaloriesTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const openCamera = useOpenCamera();
  const openQrScanner = useOpenQrScanner();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<FavoriteFood[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const items = useAddMealStore((state) => state.items);
  const addItem = useAddMealStore((state) => state.addItem);
  const increaseServings = useAddMealStore((state) => state.increaseServings);
  const decreaseServings = useAddMealStore((state) => state.decreaseServings);
  const clearMeal = useAddMealStore((state) => state.clearMeal);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void listFavoriteFoods().then((favorites) => {
        if (active) {
          setFavoriteFoods(favorites);
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const favoriteQuantities = useMemo(
    () =>
      items.reduce<Record<string, number>>((accumulator, item) => {
        if (item.sourceKey?.startsWith('favorite:')) {
          accumulator[item.sourceKey] = item.servings;
        }

        return accumulator;
      }, {}),
    [items]
  );

  const filteredFavorites = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return favoriteFoods;
    }

    return favoriteFoods.filter((favorite) =>
      favorite.name.toLowerCase().includes(normalizedQuery)
    );
  }, [favoriteFoods, searchValue]);

  const mealTotals = useMemo(
    () =>
      items.reduce(
        (totals, item) => ({
          calories: totals.calories + item.totalCalories * item.servings,
          protein: totals.protein + item.proteinGrams * item.servings,
          carbs: totals.carbs + item.carbsGrams * item.servings,
          fat: totals.fat + item.fatGrams * item.servings,
          weight: totals.weight + (item.quantityGrams ?? 0) * item.servings,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, weight: 0 }
      ),
    [items]
  );

  const proteinLabel = t('statsScreen.macros.protein');
  const carbsLabel = t('statsScreen.macros.carbs');
  const fatLabel = t('statsScreen.macros.fat');

  const handleCaptureFood = useCallback(async () => {
    const photo = await openCamera();

    if (!photo) {
      return;
    }

    router.push({
      pathname: '/food-form',
      params: {
        imageUri: photo.uri,
        context: 'addMeal',
        foodName: t('addScreen.result.presets.scanFood.title'),
        quantityLabel: '250',
        calories: '615',
        carbs: '93',
        protein: '18',
        fat: '22',
      },
    });
  }, [openCamera, t]);

  const handleBarcodeScan = useCallback(async () => {
    const barcodeValue = await openQrScanner();

    if (!barcodeValue) {
      return;
    }

    router.push({
      pathname: '/food-form',
      params: {
        context: 'addMeal',
        notes: barcodeValue,
        foodName: t('addScreen.result.presets.barcode.title'),
        quantityLabel: '100',
        calories: '235',
        carbs: '29',
        protein: '12',
        fat: '9',
      },
    });
  }, [openQrScanner, t]);

  const handleManualEntry = useCallback(() => {
    router.push({
      pathname: '/food-form',
      params: {
        context: 'addMeal',
      },
    });
  }, []);

  const handleClearMeal = useCallback(() => {
    appAlert.alert(t('addScreen.clearMealTitle'), t('addScreen.clearMealMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('addScreen.clearMeal'),
        style: 'destructive',
        onPress: () => {
          clearMeal();
        },
      },
    ]);
  }, [appAlert, clearMeal, t]);

  const handleSaveMeal = useCallback(async () => {
    if (items.length === 0 || isSavingMeal) {
      return;
    }

    setIsSavingMeal(true);

    try {
      const consumedAt = new Date().toISOString();

      await Promise.all(
        items.map((item, index) => {
          const totalQuantityGrams =
            item.quantityGrams !== null && item.quantityGrams !== undefined
              ? item.quantityGrams * item.servings
              : null;

          return createFoodEntry({
            mealName: item.title,
            quantityLabel: formatMealWeight(
              totalQuantityGrams,
              item.quantityLabel,
              t('common.units.gram')
            ),
            quantityGrams: totalQuantityGrams,
            totalCalories: item.totalCalories * item.servings,
            proteinGrams: item.proteinGrams * item.servings,
            carbsGrams: item.carbsGrams * item.servings,
            fatGrams: item.fatGrams * item.servings,
            notes: item.notes,
            imageUri: item.imageUri,
            consumedAt: new Date(new Date(consumedAt).getTime() - index * 60000).toISOString(),
          });
        })
      );

      clearMeal();
      toast.success(t('addScreen.saveSuccess'));
      router.replace('/');
    } catch {
      toast.error(t('addScreen.saveError'));
    } finally {
      setIsSavingMeal(false);
    }
  }, [clearMeal, isSavingMeal, items, t]);

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

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.summaryCard}>
          <View style={styles.headerActions}>
            <Button
              title={t('addScreen.clearMeal')}
              variant="outline"
              size="sm"
              leftIcon={<Icon name="refresh-outline" variant="primary" size={16} />}
              disabled={items.length === 0 || isSavingMeal}
              onPress={handleClearMeal}
            />
            <Button
              title={t('addScreen.saveMeal')}
              size="sm"
              leftIcon={<Icon name="save-outline" variant="primary" size={16} />}
              disabled={items.length === 0}
              loading={isSavingMeal}
              onPress={() => {
                void handleSaveMeal();
              }}
            />
          </View>

          <LinearGradient colors={theme.colors.gradient.primary} style={styles.totalCaloriesCard}>
            <Text variant="caption" color="secondary">
              {t('addScreen.totalCalories')}
            </Text>
            <Text variant="h2" weight="bold">
              {Math.round(mealTotals.calories)}
              <Text variant="caption" weight="semibold" color="secondary">
                {` ${t('common.units.kcal')}`}
              </Text>
            </Text>
            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryMetricItem}>
                <Text variant="caption" color="secondary">
                  {proteinLabel}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {Math.round(mealTotals.protein)}
                  <Text variant="caption" weight="semibold" color="secondary">
                    {t('common.units.gram')}
                  </Text>
                </Text>
              </View>
              <View style={styles.summaryMetricItem}>
                <Text variant="caption" color="secondary">
                  {carbsLabel}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {Math.round(mealTotals.carbs)}
                  <Text variant="caption" weight="semibold" color="secondary">
                    {t('common.units.gram')}
                  </Text>
                </Text>
              </View>
              <View style={styles.summaryMetricItem}>
                <Text variant="caption" color="secondary">
                  {fatLabel}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {Math.round(mealTotals.fat)}
                  <Text variant="caption" weight="semibold" color="secondary">
                    {t('common.units.gram')}
                  </Text>
                </Text>
              </View>
              <View style={styles.summaryMetricItem}>
                <Text variant="caption" color="secondary">
                  {t('addScreen.totalWeight')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  {Math.round(mealTotals.weight)}
                  <Text variant="caption" weight="semibold" color="secondary">
                    {t('common.units.gram')}
                  </Text>
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text variant="body" weight="semibold">
              {t('addScreen.addedItemsTitle')}
            </Text>
            <Text variant="caption" color="secondary">
              {t('addScreen.addedItemsCount', { count: items.length })}
            </Text>
          </View>

          <View style={styles.mealList}>
            {items.length === 0 ? (
              <Card variant="filled" style={styles.emptyCard}>
                <Text variant="body" weight="semibold" align="center">
                  {t('addScreen.emptyTitle')}
                </Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  {t('addScreen.emptySubtitle')}
                </Text>
              </Card>
            ) : (
              items.map((item) => {
                const quantityDisplay = formatMealWeight(
                  item.quantityGrams,
                  item.quantityLabel,
                  t('common.units.gram')
                );
                return (
                  <AddMealFoodCard
                    key={item.id}
                    title={item.title}
                    quantityDisplay={quantityDisplay}
                    imageUri={item.imageUri}
                    totalCalories={item.totalCalories}
                    proteinGrams={item.proteinGrams}
                    carbsGrams={item.carbsGrams}
                    fatGrams={item.fatGrams}
                    servings={item.servings}
                    proteinLabel={proteinLabel}
                    carbsLabel={carbsLabel}
                    fatLabel={fatLabel}
                    gramUnit={t('common.units.gram')}
                    kcalUnit={t('common.units.kcal')}
                    decreaseLabel={t('addScreen.decreasePortion')}
                    increaseLabel={t('addScreen.increasePortion')}
                    onDecrease={() => decreaseServings(item.id)}
                    onIncrease={() => increaseServings(item.id)}
                  />
                );
              })
            )}
          </View>

          <View style={styles.quickActionsBlock}>
            <View style={styles.sectionHeader}>
              <Text variant="body" weight="semibold">
                {t('addScreen.addFoodTitle')}
              </Text>
              <Button
                title={t('addScreen.favoriteFoodsAction')}
                variant="outline"
                size="sm"
                leftIcon={<Icon name="library-outline" variant="primary" size={16} />}
                onPress={() => bottomSheetRef.current?.present()}
              />
            </View>

            <View style={styles.actionsList}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('addScreen.captureModes.manual')}
                style={styles.actionButton}
                onPress={handleManualEntry}
              >
                <View style={styles.actionIconWrap}>
                  <Icon name="create-outline" variant="primary" size={20} />
                </View>
                <Text variant="caption" weight="semibold" align="center" style={styles.actionLabel}>
                  {t('addScreen.captureModes.manual')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('addScreen.captureModes.scanFood')}
                style={styles.actionButton}
                onPress={() => {
                  void handleCaptureFood();
                }}
              >
                <View style={styles.actionIconWrap}>
                  <Icon name="camera-outline" variant="primary" size={20} />
                </View>
                <Text variant="caption" weight="semibold" align="center" style={styles.actionLabel}>
                  {t('addScreen.captureModes.scanFood')}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('addScreen.captureModes.barcode')}
                style={styles.actionButton}
                onPress={() => {
                  void handleBarcodeScan();
                }}
              >
                <View style={styles.actionIconWrap}>
                  <Icon name="barcode-outline" variant="primary" size={20} />
                </View>
                <Text variant="caption" weight="semibold" align="center" style={styles.actionLabel}>
                  {t('addScreen.captureModes.barcode')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['65%', '88%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerCopy}>
              <Text variant="h3">{t('addScreen.favoriteFoodsTitle')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('addScreen.favoriteFoodsSubtitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.sheetCloseButton}
              onPress={() => bottomSheetRef.current?.dismiss()}
            >
              <Icon name="close" variant="muted" size={18} />
            </Pressable>
          </View>

          <SearchBar
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder={t('addScreen.favoriteSearchPlaceholder')}
          />

          <BottomSheetFlatList
            data={filteredFavorites}
            keyExtractor={(item: FavoriteFood) => item.id}
            contentContainerStyle={styles.sheetList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Card variant="filled" style={styles.sheetEmptyCard}>
                <Text variant="body" weight="semibold" align="center">
                  {t('addScreen.favoriteEmptyTitle')}
                </Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  {t('addScreen.favoriteEmptySubtitle')}
                </Text>
              </Card>
            }
            renderItem={({ item }: { item: FavoriteFood }) => {
              const sourceKey = `favorite:${item.id}`;
              const currentQuantity = favoriteQuantities[sourceKey] ?? 0;
              const draftItem = toDraftMealFavoriteItem(item);
              const quantityDisplay = formatMealWeight(
                item.quantityGrams,
                item.quantityLabel,
                t('common.units.gram')
              );

              return (
                <AddMealFoodCard
                  title={item.name}
                  quantityDisplay={quantityDisplay}
                  imageUri={draftItem.imageUri}
                  totalCalories={item.totalCalories}
                  proteinGrams={item.proteinGrams}
                  carbsGrams={item.carbsGrams}
                  fatGrams={item.fatGrams}
                  servings={currentQuantity}
                  proteinLabel={proteinLabel}
                  carbsLabel={carbsLabel}
                  fatLabel={fatLabel}
                  gramUnit={t('common.units.gram')}
                  kcalUnit={t('common.units.kcal')}
                  decreaseLabel={t('addScreen.decreasePortion')}
                  increaseLabel={t('addScreen.increasePortion')}
                  onDecrease={() => {
                    const existingItem = items.find(
                      (draftMealItem) => draftMealItem.sourceKey === sourceKey
                    );

                    if (existingItem) {
                      decreaseServings(existingItem.id);
                    }
                  }}
                  onIncrease={() => addItem(draftItem)}
                />
              );
            }}
          />
        </View>
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  summaryCard: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
    backgroundColor: theme.colors.background.surface,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  totalCaloriesCard: {
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.brand.primary,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  summaryMetricItem: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  mealList: {
    gap: theme.metrics.spacingV.p12,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p20,
  },
  quickActionsBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  actionsList: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p16,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  actionIconWrap: {
    width: hs(44),
    height: hs(44),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  actionLabel: {
    minHeight: theme.metrics.spacingV.p28,
  },
  sheetBackground: {
    backgroundColor: theme.colors.background.app,
  },
  sheetHandle: {
    backgroundColor: theme.colors.border.default,
  },
  sheetContent: {
    flex: 1,
    gap: theme.metrics.spacingV.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  sheetCloseButton: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  sheetList: {
    gap: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p20,
  },
  sheetEmptyCard: {
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p20,
  },
}));

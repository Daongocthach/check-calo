import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Dialog, Icon, Loading, Text } from '@/common/components';
import {
  ensureDefaultManualMealsForWeek,
  listManualMealsPage,
  type ManualMeal,
} from '@/features/nutrition/services/manualMealsDatabase';
import {
  createFoodEntry,
  listRecentFoodsPage,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { useFoodEntryRefreshStore } from '@/features/nutrition/stores/useFoodEntryRefreshStore';
import type { RecentFood, MealType } from '@/features/nutrition/types';
import { formatMealWeight } from '@/features/nutrition/utils/quantity';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { toast } from '@/utils/toast';
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

interface TodayMealChip {
  key: string;
  meal: ManualMeal;
  mealType: MealType;
  title: string;
  subtitle: string;
  itemCount: number;
  calories: string;
}

const RECENT_FOOD_LIMIT = 4;
const MENU_MEAL_LIMIT = 12;
const MENU_TODAY_MEAL_ORDER: Readonly<Record<MealType, number>> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
  other: 4,
};

function getMealTypeLabel(t: TFunction, mealType: MealType) {
  const translate = t as unknown as (key: string) => string;

  switch (mealType) {
    case 'breakfast':
      return translate('homeScreen.meals.breakfast');
    case 'lunch':
      return translate('homeScreen.meals.lunch');
    case 'dinner':
      return translate('homeScreen.meals.dinner');
    case 'snack':
      return translate('menuScreen.sections.snack');
    default:
      return translate('menuScreen.sections.snack');
  }
}

function getTodayMealTitle(t: TFunction, meal: ManualMeal) {
  const mealName = meal.name.trim();

  if (
    mealName.length > 0 &&
    !mealName.includes('meals.') &&
    !mealName.includes('homeScreen.meals.') &&
    !mealName.includes('menuScreen.')
  ) {
    return mealName;
  }

  return getMealTypeLabel(t, meal.mealType);
}

function getMealTypeIconName(mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return 'sunny-outline';
    case 'lunch':
      return 'restaurant-outline';
    case 'dinner':
      return 'moon-outline';
    case 'snack':
      return 'leaf-outline';
    default:
      return 'restaurant-outline';
  }
}

function getMealTypeIconVariant(mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return 'accent';
    case 'lunch':
      return 'primary';
    case 'dinner':
      return 'muted';
    case 'snack':
      return 'secondary';
    default:
      return 'primary';
  }
}

export function AddMealSourceBottomSheet({
  onManualPress,
  onPhotoPress,
  onLibraryPress,
  onBarcodePress,
  onRecentFoodPress,
  onViewAllRecentPress,
}: AddMealSourceBottomSheetProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const { openSheet, closeSheet } = useAppBottomSheet();
  const sheetState = useAddMealSourceSheetStore((state) => state.sheetState);
  const payload = useAddMealSourceSheetStore((state) => state.payload);
  const setSheetState = useAddMealSourceSheetStore((state) => state.setSheetState);
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const recentFoodsRefreshRevision = useFoodEntryRefreshStore(
    (state) => state.recentFoodsRefreshRevision
  );
  const menuRefreshRevision = useFoodEntryRefreshStore((state) => state.menuRefreshRevision);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [hasNextRecentPage, setHasNextRecentPage] = useState(false);
  const [isLoadingRecentFoods, setIsLoadingRecentFoods] = useState(false);
  const [isLoadingMoreRecentFoods, setIsLoadingMoreRecentFoods] = useState(false);
  const [todayMeals, setTodayMeals] = useState<ManualMeal[]>([]);
  const [isLoadingTodayMeals, setIsLoadingTodayMeals] = useState(false);
  const [pendingMenuMeal, setPendingMenuMeal] = useState<ManualMeal | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const fallbackSelectedDayIsoRef = useRef(new Date().toISOString());
  const selectedDayIso = payload?.selectedDateIso ?? fallbackSelectedDayIsoRef.current;
  const selectedDay = useMemo(() => new Date(selectedDayIso), [selectedDayIso]);
  const selectedDayStart = useMemo(() => {
    const nextDate = new Date(selectedDay);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
  }, [selectedDay]);
  const selectedDayEnd = useMemo(() => {
    const nextDate = new Date(selectedDayStart);
    nextDate.setHours(23, 59, 59, 999);
    return nextDate;
  }, [selectedDayStart]);

  const handleSelect = useCallback(
    (action: () => void) => {
      pendingActionRef.current = action;
      closeSheet();
    },
    [closeSheet]
  );

  const handleDismiss = useCallback(() => {
    setSheetState('closed');
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, [setSheetState]);

  const loadRecentFoods = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setIsLoadingMoreRecentFoods(true);
    } else {
      setIsLoadingRecentFoods(true);
    }

    try {
      const result = await listRecentFoodsPage({
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

  const loadTodayMeals = useCallback(async () => {
    setIsLoadingTodayMeals(true);

    try {
      await ensureDefaultManualMealsForWeek(selectedDayStart);
      const result = await listManualMealsPage({
        page: 1,
        pageSize: MENU_MEAL_LIMIT,
        startDate: selectedDayStart,
        endDate: selectedDayEnd,
      });

      setTodayMeals(result.items);
    } catch {
      setTodayMeals([]);
    } finally {
      setIsLoadingTodayMeals(false);
    }
  }, [selectedDayEnd, selectedDayStart]);

  useEffect(() => {
    if (sheetState !== 'opening') {
      return;
    }

    setRecentFoods([]);
    setRecentPage(1);
    setHasNextRecentPage(false);
    setTodayMeals([]);
    void loadRecentFoods(1, false);
    void loadTodayMeals();
  }, [loadRecentFoods, loadTodayMeals, sheetState]);

  useEffect(() => {
    if (recentFoodsRefreshRevision > 0 && sheetState === 'opening') {
      void loadRecentFoods(1, false);
    }
  }, [recentFoodsRefreshRevision, loadRecentFoods, sheetState]);

  useEffect(() => {
    if (menuRefreshRevision > 0 && sheetState === 'opening') {
      void loadTodayMeals();
    }
  }, [menuRefreshRevision, loadTodayMeals, sheetState]);

  useEffect(() => {
    if (sheetState === 'closed') {
      setPendingMenuMeal(null);
    }
  }, [sheetState]);

  const handleMenuMealPress = useCallback((meal: ManualMeal) => {
    setPendingMenuMeal(meal);
  }, []);

  const handleConfirmMenuMeal = useCallback(() => {
    if (!pendingMenuMeal) {
      return;
    }

    void (async () => {
      try {
        const mealTitle = pendingMenuMeal.name;
        const nowIso = new Date().toISOString();

        for (const item of pendingMenuMeal.items) {
          const servings = Math.max(1, item.servings);
          const quantityGrams =
            item.quantityGrams !== null && item.quantityGrams !== undefined
              ? item.quantityGrams * servings
              : null;

          await createFoodEntry({
            barcode: item.sourceKey?.startsWith('barcode:')
              ? item.sourceKey.replace('barcode:', '')
              : null,
            mealName: item.title,
            quantityLabel: formatMealWeight(
              quantityGrams,
              item.quantityLabel,
              t('common.units.gram')
            ),
            quantityGrams,
            totalCalories: item.totalCalories * servings,
            proteinGrams: item.proteinGrams * servings,
            carbsGrams: item.carbsGrams * servings,
            fatGrams: item.fatGrams * servings,
            notes: item.notes,
            imageUri: item.imageUri,
            thumbnailUri: item.thumbnailUri,
            consumedAt: nowIso,
            entryDate: nowIso,
          });
        }

        markFoodEntriesChanged();
        toast.success(
          t('addScreen.menuToday.loggedSuccess', {
            mealName: mealTitle,
          })
        );
        setPendingMenuMeal(null);
        closeSheet();
      } catch {
        toast.error(t('addScreen.menuToday.saveFailed'));
      }
    })();
  }, [closeSheet, markFoodEntriesChanged, pendingMenuMeal, t]);

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

  const todayMealChips = useMemo<TodayMealChip[]>(
    () =>
      [...todayMeals]
        .filter((meal) => meal.items.length > 0)
        .sort((left, right) => {
          const leftOrder = MENU_TODAY_MEAL_ORDER[left.mealType] ?? MENU_TODAY_MEAL_ORDER.other;
          const rightOrder = MENU_TODAY_MEAL_ORDER[right.mealType] ?? MENU_TODAY_MEAL_ORDER.other;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return left.eatenAt.localeCompare(right.eatenAt);
        })
        .map((meal) => ({
          key: meal.localId,
          meal,
          mealType: meal.mealType,
          title: getTodayMealTitle(t, meal),
          subtitle: t('addScreen.menuToday.itemSummary', { count: meal.items.length }),
          itemCount: meal.items.length,
          calories: `${Math.round(meal.totalCalories)} kcal`,
        })),
    [t, todayMeals]
  );

  const shouldShowTodayMealsSection = isLoadingTodayMeals || todayMealChips.length > 0;

  let recentFoodsContent: ReactNode;
  let todayMealsContent: ReactNode;

  if (isLoadingTodayMeals) {
    todayMealsContent = (
      <View style={styles.recentLoadingState}>
        <Loading size="small" />
      </View>
    );
  } else if (todayMealChips.length === 0) {
    todayMealsContent = (
      <View style={styles.recentEmptyState}>
        <View style={styles.recentEmptyIcon}>
          <Icon name="restaurant-outline" size={22} variant="primary" />
        </View>
        <View style={styles.recentEmptyCopy}>
          <Text variant="bodySmall" weight="semibold">
            {t('addScreen.menuToday.emptyTitle')}
          </Text>
          <Text variant="caption" color="secondary">
            {t('addScreen.menuToday.emptySubtitle')}
          </Text>
        </View>
      </View>
    );
  } else {
    todayMealsContent = (
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentList}
      >
        {todayMealChips.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => handleMenuMealPress(item.meal)}
            style={styles.mealChip}
          >
            <View style={styles.mealThumb}>
              <Icon
                name={getMealTypeIconName(item.mealType)}
                size={20}
                variant={getMealTypeIconVariant(item.mealType)}
                color={item.mealType === 'dinner' ? theme.colors.text.primary : undefined}
              />
            </View>
            <View style={styles.recentCopy}>
              <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1}>
                {`${item.subtitle} · ${item.calories}`}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

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
            onPress={() => handleSelect(() => onRecentFoodPress(item.key))}
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

  const options = useMemo(
    () =>
      [
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
      ] as const,
    [onBarcodePress, onLibraryPress, onManualPress, onPhotoPress]
  );

  const sheetContent = useMemo(
    () => (
      <View style={styles.sheetContent}>
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
            <Icon name="chevron-forward" size={16} color={theme.colors.icon.primary} />
          </Pressable>
        </View>
        {recentFoodsContent}

        {shouldShowTodayMealsSection ? (
          <>
            <View style={styles.menuTodayHeader}>
              <Text variant="body" weight="semibold">
                {t('addScreen.menuToday.title')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('addScreen.menuToday.viewMenu')}
                onPress={() => {
                  handleSelect(() => {
                    router.push('/menu');
                  });
                }}
                style={styles.viewAllButton}
              >
                <Text variant="bodySmall" weight="semibold" color="primary">
                  {t('addScreen.menuToday.viewMenu')}
                </Text>
                <Icon name="chevron-forward" size={16} color={theme.colors.icon.primary} />
              </Pressable>
            </View>

            {todayMealsContent}
          </>
        ) : null}
      </View>
    ),
    [
      handleSelect,
      onViewAllRecentPress,
      options,
      recentFoodsContent,
      todayMealsContent,
      shouldShowTodayMealsSection,
      t,
      theme.colors.brand.primaryVariant,
      theme.colors.icon.primary,
      router,
    ]
  );

  const menuMealDialog = useMemo(() => {
    if (!pendingMenuMeal) {
      return null;
    }

    return (
      <Dialog
        visible
        onDismiss={() => setPendingMenuMeal(null)}
        title={t('addScreen.menuToday.alertTitle')}
        message={t('addScreen.menuToday.alertMessage')}
        actions={[
          {
            label: t('common.cancel'),
            variant: 'outline',
            onPress: () => setPendingMenuMeal(null),
          },
          {
            label: t('addScreen.menuToday.confirmAction'),
            onPress: handleConfirmMenuMeal,
          },
        ]}
        keyboardAware
      >
        <View style={styles.menuMealDialogContent}>
          <View style={styles.menuMealDialogSummary}>
            <Icon
              name={getMealTypeIconName(pendingMenuMeal.mealType)}
              size={20}
              variant={getMealTypeIconVariant(pendingMenuMeal.mealType)}
              color={pendingMenuMeal.mealType === 'dinner' ? theme.colors.text.primary : undefined}
            />
            <View style={styles.menuMealDialogSummaryCopy}>
              <Text variant="bodySmall" weight="semibold">
                {getTodayMealTitle(t, pendingMenuMeal)}
              </Text>
              <Text variant="caption" color="secondary">
                {getMealTypeLabel(t, pendingMenuMeal.mealType)} ·{' '}
                {t('addScreen.menuToday.itemSummary', {
                  count: pendingMenuMeal.items.length,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.menuMealDialogItems}>
            {pendingMenuMeal.items.map((item) => (
              <View key={item.localId} style={styles.menuMealDialogItem}>
                <Text variant="bodySmall" weight="semibold" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" color="secondary" numberOfLines={1}>
                  {formatMealWeight(item.quantityGrams, item.quantityLabel, t('common.units.gram'))}
                  {' · '}
                  {`${Math.round(item.totalCalories)} ${t('common.units.kcal')}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Dialog>
    );
  }, [handleConfirmMenuMeal, pendingMenuMeal, t, theme.colors.text.primary]);

  useEffect(() => {
    if (sheetState === 'closed') {
      return;
    }

    openSheet(sheetContent, {
      snapPoints: ['100%'],
      containerVariant: 'scroll',
      enablePanDownToClose: true,
      onDismiss: handleDismiss,
    });
  }, [handleDismiss, openSheet, sheetContent, sheetState]);

  return menuMealDialog;
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

import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import {
  Dialog,
  Icon,
  IconButton,
  Input,
  Loading,
  ScreenContainer,
  Text,
} from '@/common/components';
import { MenuMealCard } from '@/features/nutrition/components/MenuMealCard';
import { MenuWeekSelector } from '@/features/nutrition/components/MenuWeekSelector';
import {
  deleteManualMealItem,
  ensureDefaultManualMealsForWeek,
  listManualMealsPage,
  updateManualMealItem,
  type ManualMeal,
  type ManualMealItem,
} from '@/features/nutrition/services/manualMealsDatabase';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import type { MealType, UserProfile } from '@/features/nutrition/types';
import { useCurrentDate } from '@/hooks';
import { toast } from '@/utils/toast';

interface MenuSection {
  key: string;
  meal: ManualMeal;
  data: ManualMealItem[];
}

interface ItemDialogState {
  visible: boolean;
  mealId: string | null;
  itemId: string | null;
  title: string;
  quantityLabel: string;
  quantityGrams: string;
  totalCalories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
  notes: string;
  error: string | null;
}

interface DeleteDialogState {
  visible: boolean;
  itemId: string | null;
  itemName: string;
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const MENU_PAGE_SIZE = 20;

const DEFAULT_ITEM_DIALOG_STATE: ItemDialogState = {
  visible: false,
  mealId: null,
  itemId: null,
  title: '',
  quantityLabel: '',
  quantityGrams: '',
  totalCalories: '',
  proteinGrams: '',
  carbsGrams: '',
  fatGrams: '',
  notes: '',
  error: null,
};

const DEFAULT_DELETE_DIALOG_STATE: DeleteDialogState = {
  visible: false,
  itemId: null,
  itemName: '',
};

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getProgressPercent(value: number, target?: number | null) {
  if (!target || target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / target) * 100));
}

function getPositiveTarget(value?: number | null) {
  return value && value > 0 ? value : 0;
}

type MacroTone = 'protein' | 'carbs' | 'fat';

function getMealIconName(mealType: MealType) {
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

function getMealIconVariant(mealType: MealType) {
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

function getMealIconStyle(mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return styles.mealIconBreakfast;
    case 'lunch':
      return styles.mealIconLunch;
    case 'dinner':
      return styles.mealIconDinner;
    case 'snack':
      return styles.mealIconSnack;
    default:
      return styles.mealIconLunch;
  }
}

function getMacroTextStyle(tone: MacroTone) {
  switch (tone) {
    case 'protein':
      return styles.macroProtein;
    case 'carbs':
      return styles.macroCarbs;
    case 'fat':
      return styles.macroFat;
  }
}

function getMacroTrackStyle(tone: MacroTone) {
  switch (tone) {
    case 'protein':
      return styles.macroTrackProtein;
    case 'carbs':
      return styles.macroTrackCarbs;
    case 'fat':
      return styles.macroTrackFat;
  }
}

function ProgressTrack({ percent, tone }: { percent: number; tone: MacroTone }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          getMacroTrackStyle(tone),
          { width: `${Math.max(6, percent)}%` },
        ]}
      />
    </View>
  );
}

function MacroSummary({
  tone,
  label,
  value,
  target,
  unit,
  locale,
}: {
  tone: MacroTone;
  label: string;
  value: number;
  target: number;
  unit: string;
  locale: string;
}) {
  const percent = getProgressPercent(value, target);

  return (
    <View style={styles.macroSummary}>
      <View style={styles.macroSummaryHeader}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.macroValueRow}>
        <Text variant="h3" weight="bold" style={getMacroTextStyle(tone)}>
          {formatNumber(Math.round(value), locale)}
        </Text>
        <Text variant="body" color="secondary">
          {`/ ${formatNumber(Math.round(target), locale)}${unit}`}
        </Text>
      </View>
      <ProgressTrack percent={percent} tone={tone} />
      <Text variant="bodySmall" color="secondary" weight="semibold">
        {`${percent}%`}
      </Text>
    </View>
  );
}

function parseRequiredNumber(value: string) {
  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function toItemInput(dialogState: ItemDialogState) {
  const title = dialogState.title.trim();
  const quantityLabel = dialogState.quantityLabel.trim();
  const calories = parseRequiredNumber(dialogState.totalCalories);
  const protein = parseRequiredNumber(dialogState.proteinGrams);
  const carbs = parseRequiredNumber(dialogState.carbsGrams);
  const fat = parseRequiredNumber(dialogState.fatGrams);

  if (
    !title ||
    !quantityLabel ||
    calories === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return null;
  }

  const quantityGrams = parseOptionalNumber(dialogState.quantityGrams);

  if (dialogState.quantityGrams.trim() && quantityGrams === null) {
    return null;
  }

  return {
    title,
    quantityLabel,
    quantityGrams,
    totalCalories: calories,
    proteinGrams: protein,
    carbsGrams: carbs,
    fatGrams: fat,
    notes: dialogState.notes.trim() ? dialogState.notes.trim() : null,
    servings: 1,
  };
}

function buildMealItemUpdateInput(item: ManualMealItem, servings: number) {
  return {
    title: item.title,
    quantityLabel: item.quantityLabel,
    quantityGrams: item.quantityGrams,
    totalCalories: item.totalCalories,
    proteinGrams: item.proteinGrams,
    carbsGrams: item.carbsGrams,
    fatGrams: item.fatGrams,
    notes: item.notes,
    imageUri: item.imageUri,
    thumbnailUri: item.thumbnailUri,
    sourceKey: item.sourceKey,
    servings,
  };
}

export default function MenuTab() {
  const { t, i18n } = useTranslation();
  const currentDate = useCurrentDate();
  const insets = useSafeAreaInsets();
  const requestAddMealSourceSheet = useAddMealSourceSheetStore((state) => state.requestOpen);
  const loadGenerationRef = useRef(0);
  const didMountRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState(() => currentDate);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<ManualMeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [itemDialog, setItemDialog] = useState<ItemDialogState>(DEFAULT_ITEM_DIALOG_STATE);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(DEFAULT_DELETE_DIALOG_STATE);

  const selectedDayStart = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const selectedDayEnd = useMemo(() => {
    const nextDate = startOfDay(selectedDate);
    nextDate.setHours(23, 59, 59, 999);
    return nextDate;
  }, [selectedDate]);
  const locale = i18n.language;

  const loadData = useCallback(
    async (requestedPage: number, append: boolean) => {
      const generation = ++loadGenerationRef.current;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        await ensureDefaultManualMealsForWeek(selectedDayStart);

        const [nextProfile, nextMealsPage] = await Promise.all([
          getUserProfile(),
          listManualMealsPage({
            page: requestedPage,
            pageSize: MENU_PAGE_SIZE,
            startDate: selectedDayStart,
            endDate: selectedDayEnd,
          }),
        ]);

        if (generation !== loadGenerationRef.current) {
          return;
        }

        setProfile(nextProfile);
        setMeals((currentMeals) =>
          append ? [...currentMeals, ...nextMealsPage.items] : nextMealsPage.items
        );
        setHasNextPage(nextMealsPage.hasNextPage);
        setPage(requestedPage);
      } finally {
        if (generation === loadGenerationRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [selectedDayEnd, selectedDayStart]
  );

  const refreshMenu = useCallback(() => {
    setMeals([]);
    setHasNextPage(false);
    setPage(1);
    void loadData(1, false);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      refreshMenu();
    }, [refreshMenu])
  );

  useEffect(() => {
    if (didMountRef.current) {
      refreshMenu();
      return;
    }

    didMountRef.current = true;
  }, [refreshMenu]);

  const orderedMeals = useMemo(() => {
    const mealMap = new Map<MealType, ManualMeal>();

    for (const meal of meals) {
      if (!mealMap.has(meal.mealType)) {
        mealMap.set(meal.mealType, meal);
      }
    }

    const ordered = MEAL_ORDER.map((mealType) => mealMap.get(mealType)).filter(
      (meal): meal is ManualMeal => meal !== undefined
    );
    const orderedMealTypes = new Set<MealType>(MEAL_ORDER);
    const extraMeals = meals.filter((meal) => !orderedMealTypes.has(meal.mealType));

    return [...ordered, ...extraMeals];
  }, [meals]);

  const sections = useMemo<MenuSection[]>(
    () =>
      orderedMeals.map((meal) => ({
        key: meal.localId,
        meal,
        data: meal.items,
      })),
    [orderedMeals]
  );
  const dayTotals = useMemo(
    () =>
      orderedMeals.reduce(
        (totals, meal) => ({
          calories: totals.calories + meal.totalCalories,
          protein: totals.protein + meal.totalProteinGrams,
          carbs: totals.carbs + meal.totalCarbsGrams,
          fat: totals.fat + meal.totalFatGrams,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [orderedMeals]
  );
  const calorieTarget = profile?.dailyCalorieTarget ?? 0;
  const caloriePercent = getProgressPercent(dayTotals.calories, calorieTarget);
  const proteinTarget = getPositiveTarget(profile?.proteinTargetGrams);
  const carbsTarget = getPositiveTarget(profile?.carbsTargetGrams);
  const fatTarget = getPositiveTarget(profile?.fatTargetGrams);
  const proteinShortage = Math.max(0, Math.round(proteinTarget - dayTotals.protein));
  const mealsWithItems = orderedMeals.filter((meal) => meal.items.length > 0).length;
  const averageCaloriesPerMeal = Math.round(
    mealsWithItems > 0 ? dayTotals.calories / mealsWithItems : 0
  );

  const openEditItemDialog = useCallback((meal: ManualMeal, item: ManualMealItem) => {
    setItemDialog({
      visible: true,
      mealId: meal.localId,
      itemId: item.localId,
      title: item.title,
      quantityLabel: item.quantityLabel,
      quantityGrams:
        item.quantityGrams !== null && item.quantityGrams !== undefined
          ? String(item.quantityGrams)
          : '',
      totalCalories: String(item.totalCalories),
      proteinGrams: String(item.proteinGrams),
      carbsGrams: String(item.carbsGrams),
      fatGrams: String(item.fatGrams),
      notes: item.notes ?? '',
      error: null,
    });
  }, []);

  const openDeleteItemDialog = useCallback((item: ManualMealItem) => {
    setDeleteDialog({
      visible: true,
      itemId: item.localId,
      itemName: item.title,
    });
  }, []);

  const closeItemDialog = useCallback(() => {
    setItemDialog(DEFAULT_ITEM_DIALOG_STATE);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(DEFAULT_DELETE_DIALOG_STATE);
  }, []);

  const saveItem = useCallback(async () => {
    if (isSavingItem || !itemDialog.mealId || !itemDialog.itemId) {
      return;
    }

    const itemInput = toItemInput(itemDialog);

    if (!itemInput) {
      setItemDialog((previous) => ({
        ...previous,
        error: t('menuScreen.validation.itemFormInvalid'),
      }));
      return;
    }

    setIsSavingItem(true);

    try {
      await updateManualMealItem(itemDialog.itemId, itemInput);
      closeItemDialog();
      await loadData(1, false);
    } finally {
      setIsSavingItem(false);
    }
  }, [closeItemDialog, isSavingItem, itemDialog, loadData, t]);

  const handleUpdateQuantity = useCallback(
    async (item: ManualMealItem, servings: number) => {
      if (servings < 1 || updatingItemId === item.localId) {
        return;
      }

      setUpdatingItemId(item.localId);

      try {
        await updateManualMealItem(item.localId, buildMealItemUpdateInput(item, servings));
        await loadData(1, false);
      } finally {
        setUpdatingItemId(null);
      }
    },
    [loadData, updatingItemId]
  );

  const handleDeleteItem = useCallback(async () => {
    if (!deleteDialog.itemId) {
      return;
    }

    setIsSavingItem(true);

    try {
      await deleteManualMealItem(deleteDialog.itemId);
      closeDeleteDialog();
      await loadData(1, false);
    } catch {
      toast.error(t('profileScreen.actionError'));
    } finally {
      setIsSavingItem(false);
    }
  }, [closeDeleteDialog, deleteDialog.itemId, loadData, t]);

  const handleOpenAiSuggestion = useCallback(() => {
    requestAddMealSourceSheet();
  }, [requestAddMealSourceSheet]);

  const handleAddMealItem = useCallback((meal: ManualMeal) => {
    router.push({
      pathname: '/food-form',
      params: {
        context: 'menuMeal',
        mealLocalId: meal.localId,
      },
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasNextPage) {
      return;
    }

    void loadData(page + 1, true);
  }, [hasNextPage, isLoading, isLoadingMore, loadData, page]);

  if (isLoading) {
    return (
      <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
        <View style={[styles.loadingState, { paddingTop: insets.top }]}>
          <Loading size="small" message={t('common.loading')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <MenuWeekSelector
              selectedDate={selectedDate}
              currentDate={currentDate}
              locale={locale}
              onSelectDate={setSelectedDate}
            />
            <View style={styles.summaryCard}>
              <View style={styles.calorieSummary}>
                <View style={styles.calorieCopy}>
                  <Text variant="body" weight="semibold">
                    {t('menuScreen.todayTotal')}
                  </Text>
                  <View style={styles.calorieValueRow}>
                    <Text variant="h1" weight="bold" style={styles.calorieValue}>
                      {formatNumber(Math.round(dayTotals.calories), locale)}
                    </Text>
                    <Text variant="h2" color="secondary">
                      {t('common.units.kcal')}
                    </Text>
                  </View>
                  <Text variant="body" weight="semibold" color="secondary">
                    {`/ ${formatNumber(Math.round(calorieTarget), locale)} ${t('common.units.kcal')}`}
                  </Text>
                  <View style={styles.calorieProgressRow}>
                    <ProgressTrack percent={caloriePercent} tone="fat" />
                    <Text variant="bodySmall" weight="semibold" color="secondary">
                      {`${caloriePercent}%`}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.macroSummaryGrid}>
                <MacroSummary
                  tone="protein"
                  label={t('statsScreen.macros.protein')}
                  value={dayTotals.protein}
                  target={proteinTarget}
                  unit={t('common.units.gram')}
                  locale={locale}
                />
                <MacroSummary
                  tone="carbs"
                  label={t('statsScreen.macros.carbs')}
                  value={dayTotals.carbs}
                  target={carbsTarget}
                  unit={t('common.units.gram')}
                  locale={locale}
                />
                <MacroSummary
                  tone="fat"
                  label={t('statsScreen.macros.fat')}
                  value={dayTotals.fat}
                  target={fatTarget}
                  unit={t('common.units.gram')}
                  locale={locale}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menuScreen.aiSuggestion')}
              onPress={handleOpenAiSuggestion}
            >
              <LinearGradient colors={['#F6FFF1', '#EFFAE9']} style={styles.aiBanner}>
                <View style={styles.aiSparkle}>
                  <Icon name="sparkles" size={24} variant="primary" />
                </View>
                <View style={styles.aiBannerCopy}>
                  <Text variant="body" weight="bold">
                    {t('menuScreen.aiTitle')}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('menuScreen.aiSubtitle', { value: proteinShortage || 20 })}
                  </Text>
                </View>
                <View style={styles.aiButton}>
                  <Text variant="bodySmall" weight="bold" color="onBrand">
                    {t('menuScreen.viewSuggestion')}
                  </Text>
                  <Icon name="chevron-forward" size={18} variant="onBrand" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        }
        renderItem={({ item: section }) => {
          let mealTitle = section.meal.name;

          switch (section.meal.mealType) {
            case 'breakfast':
              mealTitle = t('homeScreen.meals.breakfast');
              break;
            case 'lunch':
              mealTitle = t('homeScreen.meals.lunch');
              break;
            case 'dinner':
              mealTitle = t('homeScreen.meals.dinner');
              break;
            case 'snack':
              mealTitle = t('menuScreen.sections.snack');
              break;
          }

          return (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIcon, getMealIconStyle(section.meal.mealType)]}>
                    <Icon
                      name={getMealIconName(section.meal.mealType)}
                      size={22}
                      variant={getMealIconVariant(section.meal.mealType)}
                    />
                  </View>
                  <View style={styles.sectionHeaderCopy}>
                    <Text variant="h3">{mealTitle}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${formatNumber(Math.round(section.meal.totalCalories), locale)} ${t(
                        'common.units.kcal'
                      )}`}
                    </Text>
                  </View>
                </View>

                <IconButton
                  icon="add"
                  variant="outline"
                  accessibilityLabel={t('menuScreen.addItemAction')}
                  onPress={() => {
                    handleAddMealItem(section.meal);
                  }}
                />
                <Icon name="ellipsis-vertical" size={22} variant="primary" />
              </View>

              <View style={styles.itemList}>
                {section.data.map((item) => (
                  <MenuMealCard
                    key={item.localId}
                    item={item}
                    quantityLabel={t('menuScreen.quantityLabel')}
                    editLabel={t('common.edit')}
                    deleteLabel={t('common.delete')}
                    decreaseQuantityLabel={t('common.decreaseQuantity')}
                    increaseQuantityLabel={t('common.increaseQuantity')}
                    proteinTargetGrams={profile?.proteinTargetGrams}
                    carbsTargetGrams={profile?.carbsTargetGrams}
                    fatTargetGrams={profile?.fatTargetGrams}
                    onPress={() => {
                      router.push({
                        pathname: '/food-detail',
                        params: {
                          source: 'manual',
                          mealLocalId: section.meal.localId,
                          itemLocalId: item.localId,
                        },
                      });
                    }}
                    onEdit={() => {
                      openEditItemDialog(section.meal, item);
                    }}
                    onDelete={() => {
                      openDeleteItemDialog(item);
                    }}
                    onDecreaseQuantity={() => {
                      void handleUpdateQuantity(item, Math.max(1, item.servings - 1));
                    }}
                    onIncreaseQuantity={() => {
                      void handleUpdateQuantity(item, item.servings + 1);
                    }}
                  />
                ))}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="h3">{t('menuScreen.emptyTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('menuScreen.emptySubtitle')}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.summaryStrip}>
              <View style={styles.summaryStripItem}>
                <View style={[styles.summaryStripIcon, styles.summaryCaloriesIcon]}>
                  <Icon name="flame-outline" size={24} variant="primary" />
                </View>
                <View style={styles.summaryStripCopy}>
                  <Text variant="caption" color="secondary">
                    {t('menuScreen.summary.totalCalories')}
                  </Text>
                  <Text variant="body" weight="bold" style={styles.summaryCaloriesText}>
                    {`${formatNumber(Math.round(dayTotals.calories), locale)} ${t('common.units.kcal')}`}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryStripDivider} />
              <View style={styles.summaryStripItem}>
                <View style={[styles.summaryStripIcon, styles.summaryAverageIcon]}>
                  <Icon name="stats-chart-outline" size={24} variant="primary" />
                </View>
                <View style={styles.summaryStripCopy}>
                  <Text variant="caption" color="secondary">
                    {t('menuScreen.summary.average')}
                  </Text>
                  <Text variant="body" weight="bold" style={styles.summaryAverageText}>
                    {`${formatNumber(averageCaloriesPerMeal, locale)} ${t('common.units.kcal')}`}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryStripDivider} />
              <View style={styles.summaryStripItem}>
                <View style={[styles.summaryStripIcon, styles.summaryTargetIcon]}>
                  <Icon name="golf-outline" size={24} variant="accent" />
                </View>
                <View style={styles.summaryStripCopy}>
                  <Text variant="caption" color="secondary">
                    {t('menuScreen.summary.target')}
                  </Text>
                  <Text variant="body" weight="bold" style={styles.summaryTargetText}>
                    {`${formatNumber(Math.round(calorieTarget), locale)} ${t('common.units.kcal')}`}
                  </Text>
                </View>
              </View>
            </View>
            {isLoadingMore ? <Loading size="small" message={t('common.loading')} /> : null}
          </View>
        }
      />

      <Dialog
        visible={itemDialog.visible}
        onDismiss={closeItemDialog}
        title={t('menuScreen.editItemTitle')}
        size="lg"
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeItemDialog,
          },
          {
            label: isSavingItem ? t('common.loading') : t('common.save'),
            variant: 'primary',
            onPress: () => {
              void saveItem();
            },
          },
        ]}
      >
        <View style={styles.dialogFields}>
          <Input
            label={t('menuScreen.itemNameLabel')}
            value={itemDialog.title}
            onChangeText={(value) => {
              setItemDialog((previous) => ({ ...previous, title: value, error: null }));
            }}
            placeholder={t('menuScreen.itemNamePlaceholder')}
            error={itemDialog.error ?? undefined}
          />
          <Input
            label={t('menuScreen.quantityLabel')}
            value={itemDialog.quantityLabel}
            onChangeText={(value) => {
              setItemDialog((previous) => ({ ...previous, quantityLabel: value, error: null }));
            }}
            placeholder={t('menuScreen.quantityPlaceholder')}
          />
          <Input
            label={t('menuScreen.quantityGramsLabel')}
            value={itemDialog.quantityGrams}
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setItemDialog((previous) => ({ ...previous, quantityGrams: value, error: null }));
            }}
            placeholder={t('menuScreen.quantityGramsPlaceholder')}
          />
          <Input
            label={t('menuScreen.caloriesLabel')}
            value={itemDialog.totalCalories}
            keyboardType="decimal-pad"
            onChangeText={(value) => {
              setItemDialog((previous) => ({ ...previous, totalCalories: value, error: null }));
            }}
            placeholder={t('common.numberPlaceholder')}
          />
          <View style={styles.dialogMacroRow}>
            <View style={styles.dialogMacroItem}>
              <Input
                label={t('statsScreen.macros.protein')}
                value={itemDialog.proteinGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setItemDialog((previous) => ({ ...previous, proteinGrams: value, error: null }));
                }}
                placeholder={t('common.numberPlaceholder')}
              />
            </View>
            <View style={styles.dialogMacroItem}>
              <Input
                label={t('statsScreen.macros.carbs')}
                value={itemDialog.carbsGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setItemDialog((previous) => ({ ...previous, carbsGrams: value, error: null }));
                }}
                placeholder={t('common.numberPlaceholder')}
              />
            </View>
            <View style={styles.dialogMacroItem}>
              <Input
                label={t('statsScreen.macros.fat')}
                value={itemDialog.fatGrams}
                keyboardType="decimal-pad"
                onChangeText={(value) => {
                  setItemDialog((previous) => ({ ...previous, fatGrams: value, error: null }));
                }}
                placeholder={t('common.numberPlaceholder')}
              />
            </View>
          </View>
          <Input
            label={t('menuScreen.notesLabel')}
            value={itemDialog.notes}
            onChangeText={(value) => {
              setItemDialog((previous) => ({ ...previous, notes: value, error: null }));
            }}
            placeholder={t('menuScreen.notesPlaceholder')}
          />
        </View>
      </Dialog>

      <Dialog
        visible={deleteDialog.visible}
        onDismiss={closeDeleteDialog}
        title={t('menuScreen.deleteItemTitle')}
        size="md"
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeDeleteDialog,
          },
          {
            label: isSavingItem ? t('common.loading') : t('common.delete'),
            variant: 'primary',
            onPress: () => {
              void handleDeleteItem();
            },
          },
        ]}
      >
        <Text variant="body" color="secondary">
          {t('menuScreen.deleteItemMessage', { name: deleteDialog.itemName })}
        </Text>
      </Dialog>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.app,
  },
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p120,
    gap: theme.metrics.spacingV.p12,
  },
  headerStack: {
    gap: theme.metrics.spacingV.p16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: theme.metrics.spacing.p120,
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingVertical: theme.metrics.spacingV.p20,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: theme.metrics.spacing.p16,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p8 },
    elevation: theme.colors.shadow.elevationSmall,
  },
  calorieSummary: {
    flex: 1.55,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingRight: theme.metrics.spacing.p20,
  },
  calorieCopy: {
    width: '100%',
    minWidth: 0,
    gap: theme.metrics.spacingV.p12,
  },
  calorieValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p8,
  },
  calorieValue: {
    color: theme.colors.brand.primary,
  },
  calorieProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p16,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.border.subtle,
  },
  macroSummaryGrid: {
    flex: 2.45,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  macroSummary: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p12,
    minWidth: 0,
    paddingHorizontal: theme.metrics.spacing.p16,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border.subtle,
  },
  macroSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p4,
  },
  progressTrack: {
    flex: 1,
    height: theme.metrics.spacingV.p8,
    width: '100%',
    minWidth: theme.metrics.spacing.p64,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  macroProtein: {
    color: theme.colors.state.info,
  },
  macroCarbs: {
    color: theme.colors.state.warning,
  },
  macroFat: {
    color: theme.colors.state.success,
  },
  macroTrackProtein: {
    backgroundColor: theme.colors.state.info,
  },
  macroTrackCarbs: {
    backgroundColor: theme.colors.state.warning,
  },
  macroTrackFat: {
    backgroundColor: theme.colors.state.success,
  },
  aiBanner: {
    minHeight: theme.metrics.spacing.p72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.state.successBg,
  },
  aiSparkle: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
  },
  sectionBlock: {
    overflow: 'hidden',
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: theme.metrics.spacing.p16,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p8 },
    elevation: theme.colors.shadow.elevationSmall,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p16,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  sectionIcon: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  mealIconBreakfast: {
    backgroundColor: theme.colors.state.warningBg,
  },
  mealIconLunch: {
    backgroundColor: theme.colors.state.successBg,
  },
  mealIconDinner: {
    backgroundColor: theme.colors.state.infoBg,
  },
  mealIconSnack: {
    backgroundColor: theme.colors.background.section,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  itemList: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 1,
    shadowRadius: theme.metrics.spacing.p16,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p8 },
    elevation: theme.colors.shadow.elevationSmall,
  },
  summaryStripItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    minWidth: 0,
  },
  summaryStripIcon: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCaloriesIcon: {
    backgroundColor: theme.colors.state.successBg,
  },
  summaryAverageIcon: {
    backgroundColor: theme.colors.state.infoBg,
  },
  summaryTargetIcon: {
    backgroundColor: theme.colors.state.warningBg,
  },
  summaryStripCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  summaryCaloriesText: {
    color: theme.colors.brand.primary,
  },
  summaryAverageText: {
    color: theme.colors.state.info,
  },
  summaryTargetText: {
    color: theme.colors.brand.tertiary,
  },
  summaryStripDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border.subtle,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  aiRowCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  emptyState: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'flex-start',
    paddingVertical: theme.metrics.spacingV.p20,
  },
  footer: {
    gap: theme.metrics.spacingV.p12,
    paddingTop: theme.metrics.spacingV.p4,
  },
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  dialogFields: {
    gap: theme.metrics.spacingV.p8,
  },
  dialogMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  dialogMacroItem: {
    flex: 1,
  },
}));

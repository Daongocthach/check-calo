import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Dialog,
  Icon,
  Input,
  Loading,
  ScreenContainer,
  Select,
  Text,
} from '@/common/components';
import { MenuMealCard } from '@/features/nutrition/components/MenuMealCard';
import { MenuWeekSelector } from '@/features/nutrition/components/MenuWeekSelector';
import {
  deleteManualMealItem,
  createManualMeal,
  ensureDefaultManualMealsForWeek,
  listManualMealsPage,
  deleteManualMeal,
  renameManualMeal,
  updateManualMealItem,
  type ManualMeal,
  type ManualMealItem,
} from '@/features/nutrition/services/manualMealsDatabase';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import type { MealType, UserProfile } from '@/features/nutrition/types';
import { useBottomPadding, useCurrentDate } from '@/hooks';
import { useAppAlert } from '@/providers/app-alert';
import { toast } from '@/utils/toast';

interface MenuSection {
  key: string;
  meal: ManualMeal;
  data: ManualMealItem[];
}

interface DeleteDialogState {
  visible: boolean;
  itemId: string | null;
  itemName: string;
}

interface MealDialogState {
  visible: boolean;
  mealId: string | null;
  mealName: string;
  error: string | null;
}

interface CreateMealDialogState {
  visible: boolean;
  mealName: string;
  error: string | null;
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const MENU_PAGE_SIZE = 20;

const DEFAULT_DELETE_DIALOG_STATE: DeleteDialogState = {
  visible: false,
  itemId: null,
  itemName: '',
};

const DEFAULT_MEAL_DIALOG_STATE: MealDialogState = {
  visible: false,
  mealId: null,
  mealName: '',
  error: null,
};

const DEFAULT_CREATE_MEAL_DIALOG_STATE: CreateMealDialogState = {
  visible: false,
  mealName: '',
  error: null,
};

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function getPositiveTarget(value?: number | null) {
  return value && value > 0 ? value : 0;
}

function getMonthlyWeightGoalLabel(t: TFunction, monthlyWeightGoalKg: number) {
  switch (monthlyWeightGoalKg) {
    case 0.5:
      return t('goalTracking.goalNames.loseWithValue', { value: 0.5 });
    case 1:
      return t('goalTracking.goalNames.loseWithValue', { value: 1 });
    case 2:
      return t('goalTracking.goalNames.loseWithValue', { value: 2 });
    case -0.5:
      return t('goalTracking.goalNames.gainWithValue', { value: 0.5 });
    case -1:
      return t('goalTracking.goalNames.gainWithValue', { value: 1 });
    case -2:
      return t('goalTracking.goalNames.gainWithValue', { value: 2 });
    case 0:
    default:
      return t('goalTracking.goalNames.maintain');
  }
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

function getMealTitle(t: TFunction, mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return t('homeScreen.meals.breakfast');
    case 'lunch':
      return t('homeScreen.meals.lunch');
    case 'dinner':
      return t('homeScreen.meals.dinner');
    case 'snack':
      return t('menuScreen.sections.snack');
    default:
      return t('menuScreen.sections.snack');
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

function MacroSummary({
  tone,
  label,
  value,
  target,
  unit,
  locale,
  noBorderLeft = false,
}: {
  tone: MacroTone;
  label: string;
  value: number;
  target: number;
  unit: string;
  locale: string;
  noBorderLeft?: boolean;
}) {
  return (
    <View style={[styles.macroSummary, noBorderLeft && styles.macroSummaryFirst]}>
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="body" weight="semibold" style={getMacroTextStyle(tone)} numberOfLines={1}>
        {`${formatNumber(Math.round(value), locale)} / ${formatNumber(Math.round(target), locale)}${unit}`}
      </Text>
    </View>
  );
}

function toMealNameInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  const { theme } = useUnistyles();
  const currentDate = useCurrentDate();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const bottomPadding = useBottomPadding();
  const requestAddMealSourceSheet = useAddMealSourceSheetStore((state) => state.requestOpen);
  const requestMealPlanSuggestionSheet = useMealPlanSuggestionSheetStore(
    (state) => state.requestOpen
  );
  const mealPlanSuggestionRevision = useMealPlanSuggestionSheetStore(
    (state) => state.generationRevision
  );
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
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(DEFAULT_DELETE_DIALOG_STATE);
  const [mealDialog, setMealDialog] = useState<MealDialogState>(DEFAULT_MEAL_DIALOG_STATE);
  const [createMealDialog, setCreateMealDialog] = useState<CreateMealDialogState>(
    DEFAULT_CREATE_MEAL_DIALOG_STATE
  );

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

  useEffect(() => {
    if (mealPlanSuggestionRevision > 0) {
      refreshMenu();
    }
  }, [mealPlanSuggestionRevision, refreshMenu]);

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
  const hasAnyMealItems = orderedMeals.some((meal) => meal.items.length > 0);
  const canOpenMealReview = hasAnyMealItems;
  const calorieTarget = profile?.dailyCalorieTarget ?? 0;
  const proteinTarget = getPositiveTarget(profile?.proteinTargetGrams);
  const carbsTarget = getPositiveTarget(profile?.carbsTargetGrams);
  const fatTarget = getPositiveTarget(profile?.fatTargetGrams);
  const monthlyWeightGoalLabel = getMonthlyWeightGoalLabel(t, profile?.monthlyWeightGoalKg ?? 0);

  const openDeleteItemDialog = useCallback((item: ManualMealItem) => {
    setDeleteDialog({
      visible: true,
      itemId: item.localId,
      itemName: item.title,
    });
  }, []);

  const openEditMealDialog = useCallback((meal: ManualMeal) => {
    setMealDialog({
      visible: true,
      mealId: meal.localId,
      mealName: meal.name,
      error: null,
    });
  }, []);

  const openDeleteMealDialog = useCallback(
    (meal: ManualMeal) => {
      appAlert.alert(
        t('menuScreen.deleteMealTitle'),
        t('menuScreen.deleteMealMessage', { name: meal.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void deleteManualMeal(meal.localId)
                .then(async () => {
                  await loadData(1, false);
                })
                .catch(() => {
                  toast.error(t('profileScreen.actionError'));
                });
            },
          },
        ]
      );
    },
    [appAlert, loadData, t]
  );

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(DEFAULT_DELETE_DIALOG_STATE);
  }, []);

  const closeMealDialog = useCallback(() => {
    setMealDialog(DEFAULT_MEAL_DIALOG_STATE);
  }, []);

  const openCreateMealDialog = useCallback(() => {
    setCreateMealDialog({
      visible: true,
      mealName: '',
      error: null,
    });
  }, []);

  const closeCreateMealDialog = useCallback(() => {
    setCreateMealDialog(DEFAULT_CREATE_MEAL_DIALOG_STATE);
  }, []);

  const saveMeal = useCallback(async () => {
    if (!mealDialog.mealId) {
      return;
    }

    const mealName = toMealNameInput(mealDialog.mealName);

    if (!mealName) {
      setMealDialog((previous) => ({
        ...previous,
        error: t('menuScreen.validation.mealNameRequired'),
      }));
      return;
    }

    setIsSavingItem(true);

    try {
      await renameManualMeal(mealDialog.mealId, mealName);
      closeMealDialog();
      await loadData(1, false);
    } finally {
      setIsSavingItem(false);
    }
  }, [closeMealDialog, loadData, mealDialog.mealId, mealDialog.mealName, t]);

  const saveNewMeal = useCallback(async () => {
    const mealName = toMealNameInput(createMealDialog.mealName);

    if (!mealName) {
      setCreateMealDialog((previous) => ({
        ...previous,
        error: t('menuScreen.validation.mealNameRequired'),
      }));
      return;
    }

    setIsSavingItem(true);

    try {
      await createManualMeal(mealName);
      closeCreateMealDialog();
      await loadData(1, false);
      toast.success(t('menuScreen.createMealSuccess', { name: mealName }));
    } catch {
      toast.error(t('profileScreen.actionError'));
    } finally {
      setIsSavingItem(false);
    }
  }, [closeCreateMealDialog, createMealDialog.mealName, loadData, t]);

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

  const handleOpenMealReview = useCallback(
    (meal?: ManualMeal) => {
      if (!hasAnyMealItems) {
        return;
      }

      requestMealPlanSuggestionSheet({
        selectedDateIso: selectedDayStart.toISOString(),
        ...(meal
          ? {
              mealLocalId: meal.localId,
              mealType: meal.mealType,
            }
          : {}),
      });
    },
    [hasAnyMealItems, requestMealPlanSuggestionSheet, selectedDayStart]
  );

  const handleAddMealItem = useCallback(
    (meal: ManualMeal) => {
      requestAddMealSourceSheet({
        context: 'menuMeal',
        mealLocalId: meal.localId,
        selectedDateIso: selectedDayStart.toISOString(),
      });
    },
    [requestAddMealSourceSheet, selectedDayStart]
  );

  const handleMealAction = useCallback(
    (meal: ManualMeal, action: string) => {
      if (action === 'add') {
        handleAddMealItem(meal);
        return;
      }

      if (action === 'edit') {
        openEditMealDialog(meal);
        return;
      }

      if (action === 'delete') {
        openDeleteMealDialog(meal);
      }
    },
    [handleAddMealItem, openDeleteMealDialog, openEditMealDialog]
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasNextPage) {
      return;
    }

    void loadData(page + 1, true);
  }, [hasNextPage, isLoading, isLoadingMore, loadData, page]);

  if (isLoading) {
    return (
      <ScreenContainer padded={false} edges={['bottom']}>
        <View style={[styles.loadingState, { paddingTop: insets.top }]}>
          <Loading size="small" message={t('common.loading')} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + theme.metrics.spacingV.p32 },
        ]}
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
              <View style={styles.summaryHeader}>
                <View style={styles.summaryHeaderLeft}>
                  <Text variant="bodySmall" weight="semibold" color="secondary">
                    {t('menuScreen.todayTotal')}
                  </Text>
                  <View style={styles.calorieValueRow}>
                    <Text variant="h3" weight="bold" style={styles.calorieValue}>
                      {formatNumber(Math.round(dayTotals.calories), locale)}
                    </Text>
                    <Text variant="bodySmall" weight="semibold" color="secondary">
                      {`/ ${formatNumber(Math.round(calorieTarget), locale)} ${t(
                        'common.units.kcal'
                      )}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.planSummary}>
                  <Text variant="bodySmall" weight="semibold" color="secondary">
                    {t('menuScreen.planLabel')}
                  </Text>
                  <Text variant="body" weight="semibold" style={styles.planValue}>
                    {monthlyWeightGoalLabel}
                  </Text>
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
                  noBorderLeft
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
              <View style={styles.summaryActions}>
                <Button
                  title={t('menuScreen.addMeal')}
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="add" size={16} color={theme.colors.text.primary} />}
                  onPress={openCreateMealDialog}
                  style={styles.summaryActionButton}
                />
                <Button
                  title={t('menuScreen.review.dailyAction')}
                  variant="outline"
                  size="sm"
                  leftIcon={
                    <Icon name="sparkles-outline" size={16} color={theme.colors.text.primary} />
                  }
                  disabled={!canOpenMealReview}
                  onPress={() => {
                    handleOpenMealReview();
                  }}
                  style={styles.summaryActionButton}
                />
              </View>
            </View>
          </View>
        }
        renderItem={({ item: section }) => {
          const mealTitle = getMealTitle(t, section.meal.mealType);

          return (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIcon, getMealIconStyle(section.meal.mealType)]}>
                    <Icon
                      name={getMealIconName(section.meal.mealType)}
                      size={22}
                      variant={getMealIconVariant(section.meal.mealType)}
                      color={
                        section.meal.mealType === 'dinner' ? theme.colors.text.primary : undefined
                      }
                    />
                  </View>
                  <View style={styles.sectionHeaderCopy}>
                    <Text variant="body" weight="bold">
                      {mealTitle}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {`${formatNumber(Math.round(section.meal.totalCalories), locale)} ${t(
                        'common.units.kcal'
                      )}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionActions}>
                  <Select
                    value={section.meal.localId}
                    onChange={(action) => {
                      handleMealAction(section.meal, action);
                    }}
                    options={[
                      {
                        value: 'add',
                        label: t('menuScreen.addItemAction'),
                        iconName: 'add',
                      },
                      {
                        value: 'edit',
                        label: t('menuScreen.renameMealAction'),
                        iconName: 'create-outline',
                      },
                      {
                        value: 'delete',
                        label: t('menuScreen.deleteMealAction'),
                        iconName: 'trash-outline',
                        destructive: true,
                      },
                    ]}
                    triggerVariant="plain"
                  >
                    <View style={styles.mealMenuTrigger}>
                      <Icon name="ellipsis-vertical" size={20} color={theme.colors.text.primary} />
                    </View>
                  </Select>
                </View>
              </View>

              <View
                style={[styles.itemList, section.data.length === 0 ? styles.itemListEmpty : null]}
              >
                {section.data.length > 0 ? (
                  section.data.map((item) => (
                    <MenuMealCard
                      key={item.localId}
                      item={item}
                      deleteLabel={t('common.delete')}
                      decreaseQuantityLabel={t('addScreen.decreasePortion')}
                      increaseQuantityLabel={t('addScreen.increasePortion')}
                      proteinTargetGrams={profile?.proteinTargetGrams}
                      carbsTargetGrams={profile?.carbsTargetGrams}
                      fatTargetGrams={profile?.fatTargetGrams}
                      onPress={() => {
                        router.push({
                          pathname: '/food-form',
                          params: {
                            context: 'menuMeal',
                            mealLocalId: section.meal.localId,
                            itemLocalId: item.localId,
                          },
                        });
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
                  ))
                ) : (
                  <View style={styles.sectionEmptyState}>
                    <Text variant="bodySmall" color="secondary" align="center">
                      {t('menuScreen.mealEmptySubtitle')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="body" weight="bold">
              {t('menuScreen.emptyTitle')}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {t('menuScreen.emptySubtitle')}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {isLoadingMore ? <Loading size="small" message={t('common.loading')} /> : null}
          </View>
        }
      />

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

      <Dialog
        visible={mealDialog.visible}
        onDismiss={closeMealDialog}
        title={t('menuScreen.renameMealTitle')}
        size="md"
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeMealDialog,
          },
          {
            label: isSavingItem ? t('common.loading') : t('common.save'),
            variant: 'primary',
            onPress: () => {
              void saveMeal();
            },
          },
        ]}
      >
        <View style={styles.dialogFields}>
          <Input
            label={t('menuScreen.mealNameLabel')}
            value={mealDialog.mealName}
            onChangeText={(value) => {
              setMealDialog((previous) => ({ ...previous, mealName: value, error: null }));
            }}
            placeholder={t('menuScreen.mealNamePlaceholder')}
            error={mealDialog.error ?? undefined}
          />
        </View>
      </Dialog>

      <Dialog
        visible={createMealDialog.visible}
        onDismiss={closeCreateMealDialog}
        title={t('menuScreen.createMealTitle')}
        size="md"
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeCreateMealDialog,
          },
          {
            label: isSavingItem ? t('common.loading') : t('common.save'),
            variant: 'primary',
            onPress: () => {
              void saveNewMeal();
            },
          },
        ]}
      >
        <View style={styles.dialogFields}>
          <Input
            label={t('menuScreen.mealNameLabel')}
            value={createMealDialog.mealName}
            onChangeText={(value) => {
              setCreateMealDialog((previous) => ({ ...previous, mealName: value, error: null }));
            }}
            placeholder={t('menuScreen.mealNamePlaceholder')}
            error={createMealDialog.error ?? undefined}
          />
        </View>
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
    gap: theme.metrics.spacingV.p12,
  },
  headerStack: {
    gap: theme.metrics.spacingV.p16,
  },
  summaryCard: {
    gap: theme.metrics.spacingV.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacingV.p4,
  },
  summaryHeaderLeft: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p8,
  },
  calorieValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.metrics.spacing.p8,
  },
  calorieValue: {
    color: theme.colors.brand.primary,
    lineHeight: theme.fonts.size.xl,
  },
  planSummary: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 92,
    gap: theme.metrics.spacingV.p8,
  },
  planValue: {
    color: theme.colors.text.primary,
  },
  macroSummaryGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  summaryActionButton: {
    flex: 1,
    minWidth: 0,
  },
  macroSummary: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    minWidth: 0,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p4,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border.subtle,
  },
  macroSummaryFirst: {
    borderLeftWidth: 0,
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
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.metrics.spacing.p4,
    flexShrink: 0,
  },
  mealMenuTrigger: {
    minWidth: theme.metrics.spacing.p32,
    minHeight: theme.metrics.spacing.p32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemList: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  emptyState: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'flex-start',
    paddingVertical: theme.metrics.spacingV.p20,
  },
  footer: {
    gap: theme.metrics.spacingV.p8,
    paddingTop: theme.metrics.spacingV.p8,
  },
  itemListEmpty: {
    gap: 0,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  sectionEmptyState: {
    paddingVertical: theme.metrics.spacingV.p8,
    alignItems: 'center',
    justifyContent: 'center',
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
}));

import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Dialog,
  Icon,
  IconButton,
  Input,
  ProgressBar,
  ScreenContainer,
  Text,
} from '@/common/components';
import { HomeMealCard, type HomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import {
  listManualMeals,
  updateManualMealItem,
  type ManualMeal,
  type ManualMealItem,
} from '@/features/nutrition/services/manualMealsDatabase';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { MealType, UserProfile } from '@/features/nutrition/types';
import { useCurrentDate } from '@/hooks';

type MealFilter = MealType | 'all';
type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

interface MenuSection {
  key: string;
  title: string;
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

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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

function isSameCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function formatDayMonth(date: Date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}`;
}

function getMealTitle(meal: ManualMeal, t: TranslateFn) {
  switch (meal.mealType) {
    case 'breakfast':
      return t('meals.breakfast');
    case 'lunch':
      return t('meals.lunch');
    case 'dinner':
      return t('meals.dinner');
    case 'snack':
      return t('menuScreen.sections.snack');
    default:
      return meal.name;
  }
}

function getFilterLabel(filter: MealFilter, t: TranslateFn) {
  switch (filter) {
    case 'all':
      return t('menuScreen.filters.all');
    case 'breakfast':
      return t('meals.breakfast');
    case 'lunch':
      return t('meals.lunch');
    case 'dinner':
      return t('meals.dinner');
    case 'snack':
      return t('menuScreen.sections.snack');
    default:
      return t('menuScreen.filters.all');
  }
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

function toHomeMealCardItem(item: ManualMealItem): HomeMealCardItem {
  const servings = Math.max(1, item.servings);
  const quantityGrams =
    item.quantityGrams !== null && item.quantityGrams !== undefined
      ? item.quantityGrams * servings
      : null;

  return {
    title: item.title,
    quantityLabel: item.quantityLabel,
    quantityGrams,
    totalCalories: item.totalCalories * servings,
    proteinGrams: item.proteinGrams * servings,
    carbsGrams: item.carbsGrams * servings,
    fatGrams: item.fatGrams * servings,
    imageUri: item.imageUri,
    thumbnailUri: item.thumbnailUri,
    devSyncBadgeLabel: null,
    isFavorite: false,
  };
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

function getDateLabel(date: Date, currentDate: Date, todayLabel: string) {
  const isToday = isSameCalendarDate(date, currentDate);
  const formattedDate = formatDayMonth(date);

  if (isToday) {
    return `${todayLabel}, ${formattedDate}`;
  }

  return formattedDate;
}

interface MenuDateSelectorProps {
  selectedDate: Date;
  currentDate: Date;
  locale: string;
  todayLabel: string;
  calendarActionLabel: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onChangeDate: (date: Date) => void;
}

function MenuDateSelector({
  selectedDate,
  currentDate,
  locale,
  todayLabel,
  calendarActionLabel,
  onPreviousDay,
  onNextDay,
  onChangeDate,
}: MenuDateSelectorProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [draftDate, setDraftDate] = useState(() => startOfDay(selectedDate));
  const pickerTheme = theme.colors.mode === 'dark' ? 'dark' : 'light';
  const displayLabel = getDateLabel(selectedDate, currentDate, todayLabel);

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

  const openSheet = useCallback(() => {
    setDraftDate(startOfDay(selectedDate));
    bottomSheetRef.current?.present();
  }, [selectedDate]);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const confirmSelection = useCallback(() => {
    onChangeDate(startOfDay(draftDate));
    closeSheet();
  }, [closeSheet, draftDate, onChangeDate]);

  return (
    <>
      <Card variant="elevated" style={styles.dateCard}>
        <View style={styles.dateRow}>
          <IconButton
            icon="chevron-back-outline"
            variant="ghost"
            accessibilityLabel={t('common.back')}
            onPress={onPreviousDay}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={calendarActionLabel}
            style={styles.dateCenter}
            onPress={openSheet}
          >
            <Text variant="body" weight="medium" align="center">
              {displayLabel}
            </Text>
            <Icon name="chevron-down" size={16} variant="secondary" />
          </Pressable>

          <IconButton
            icon="chevron-forward-outline"
            variant="ghost"
            accessibilityLabel={t('common.next')}
            onPress={onNextDay}
          />
        </View>
      </Card>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={['60%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text variant="h3">{calendarActionLabel}</Text>
          </View>

          <View style={styles.sheetPickerSurface}>
            <DatePicker
              style={styles.sheetPicker}
              date={draftDate}
              locale={locale}
              mode="date"
              maximumDate={currentDate}
              onDateChange={setDraftDate}
              theme={pickerTheme}
              dividerColor={theme.colors.border.default}
              buttonColor={theme.colors.brand.primary}
            />
          </View>

          <View style={styles.sheetActions}>
            <Button title={t('common.cancel')} variant="outline" size="sm" onPress={closeSheet} />
            <Button title={t('common.confirm')} size="sm" onPress={confirmSelection} />
          </View>

          <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

export default function MenuTab() {
  const { t, i18n } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const currentDate = useCurrentDate();
  const [selectedDate, setSelectedDate] = useState(() => currentDate);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<ManualMeal[]>([]);
  const [filter, setFilter] = useState<MealFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemDialog, setItemDialog] = useState<ItemDialogState>(DEFAULT_ITEM_DIALOG_STATE);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [nextProfile, nextMeals] = await Promise.all([getUserProfile(), listManualMeals()]);
    setProfile(nextProfile);
    setMeals(nextMeals);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

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

  const filteredMeals = useMemo(() => {
    if (filter === 'all') {
      return orderedMeals;
    }

    return orderedMeals.filter((meal) => meal.mealType === filter);
  }, [filter, orderedMeals]);

  const sections = useMemo<MenuSection[]>(
    () =>
      filteredMeals.map((meal) => ({
        key: meal.localId,
        title: getMealTitle(meal, translate),
        meal,
        data: meal.items,
      })),
    [filteredMeals, translate]
  );

  const totalCalories = useMemo(
    () =>
      orderedMeals.reduce((sum, meal) => {
        return sum + meal.totalCalories;
      }, 0),
    [orderedMeals]
  );

  const dailyTarget = profile?.dailyCalorieTarget ?? 0;
  const progressPercent = dailyTarget > 0 ? Math.round((totalCalories / dailyTarget) * 100) : 0;
  const locale = i18n.language;
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

  const closeItemDialog = useCallback(() => {
    setItemDialog(DEFAULT_ITEM_DIALOG_STATE);
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
      await loadData();
    } finally {
      setIsSavingItem(false);
    }
  }, [closeItemDialog, isSavingItem, itemDialog, loadData, t]);

  const handleAddFood = useCallback(() => {
    router.push('/food-form');
  }, []);

  const handleAddMealItem = useCallback((meal: ManualMeal) => {
    router.push({
      pathname: '/food-form',
      params: {
        context: 'menuMeal',
        mealLocalId: meal.localId,
      },
    });
  }, []);

  const handlePreviousDay = useCallback(() => {
    setSelectedDate((value) => addDays(value, -1));
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate((value) => addDays(value, 1));
  }, []);

  if (isLoading) {
    return (
      <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
        <View style={styles.loadingState}>
          <Text variant="body" color="secondary">
            {t('common.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.localId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.screen}>
            <MenuDateSelector
              selectedDate={selectedDate}
              currentDate={currentDate}
              locale={i18n.language}
              todayLabel={translate('menuScreen.todayLabel')}
              calendarActionLabel={translate('menuScreen.calendarAction')}
              onPreviousDay={handlePreviousDay}
              onNextDay={handleNextDay}
              onChangeDate={setSelectedDate}
            />

            <Card variant="elevated" style={styles.energyCard}>
              <View style={styles.energyHeader}>
                <Text variant="h3">{t('menuScreen.energyTitle')}</Text>
              </View>
              <View style={styles.energyValueRow}>
                <Text variant="h1" weight="bold">
                  {formatNumber(totalCalories, locale)}
                </Text>
                <Text variant="h3" color="secondary">
                  {' / '}
                  {formatNumber(dailyTarget, locale)} {t('common.units.kcal')}
                </Text>
                <Text variant="body" color="primary" style={styles.energyGoalLabel}>
                  {t('homeScreen.goalPercent', {
                    percent: Math.min(999, Math.max(0, progressPercent)),
                  })}
                </Text>
              </View>
              <ProgressBar
                value={Math.min(100, Math.max(0, progressPercent))}
                colorScheme="success"
                size="sm"
                accessibilityLabel={t('menuScreen.energyTitle')}
              />
            </Card>

            <Card variant="elevated" style={styles.filterCard}>
              <View style={styles.filterRow}>
                {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as MealFilter[]).map(
                  (option) => {
                    const isActive = filter === option;

                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        style={[styles.filterPill, isActive && styles.filterPillActive]}
                        onPress={() => {
                          setFilter(option);
                        }}
                      >
                        <Text
                          variant="bodySmall"
                          weight={isActive ? 'semibold' : 'medium'}
                          color={isActive ? 'primary' : 'secondary'}
                          align="center"
                        >
                          {getFilterLabel(option, translate)}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="h3">{section.title}</Text>
              <View style={styles.sectionHeaderActions}>
                <Text variant="body" color="secondary">
                  {`${formatNumber(Math.round(section.meal.totalCalories), locale)} ${t('common.units.kcal')}`}
                </Text>
                <IconButton
                  icon="add"
                  size="sm"
                  variant="outline"
                  accessibilityLabel={t('menuScreen.addItemAction')}
                  onPress={() => {
                    handleAddMealItem(section.meal);
                  }}
                />
              </View>
            </View>
          </View>
        )}
        renderItem={({ item, section }) => {
          const cardItem = toHomeMealCardItem(item);

          return (
            <View style={styles.itemCardWrap}>
              <HomeMealCard.Root
                item={cardItem}
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
              >
                <HomeMealCard.Preview />
                <HomeMealCard.Content>
                  <HomeMealCard.Header>
                    <HomeMealCard.Actions>
                      <HomeMealCard.ActionButton
                        icon="ellipsis-vertical"
                        label={t('common.more')}
                        onPress={() => {
                          openEditItemDialog(section.meal, item);
                        }}
                      />
                    </HomeMealCard.Actions>
                  </HomeMealCard.Header>
                  <HomeMealCard.Macros
                    proteinTargetGrams={profile?.proteinTargetGrams}
                    carbsTargetGrams={profile?.carbsTargetGrams}
                    fatTargetGrams={profile?.fatTargetGrams}
                  />
                </HomeMealCard.Content>
              </HomeMealCard.Root>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menuScreen.addFoodAction')}
              style={styles.primaryAction}
              onPress={handleAddFood}
            >
              <Icon name="add" size={24} variant="onBrand" />
              <Text variant="body" weight="semibold" color="inverse">
                {t('menuScreen.addFoodAction')}
              </Text>
            </Pressable>
          </View>
        }
        SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="h3">{t('menuScreen.emptyTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('menuScreen.emptySubtitle')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menuScreen.addFoodAction')}
              style={styles.primaryAction}
              onPress={handleAddFood}
            >
              <Icon name="add" size={24} variant="onBrand" />
              <Text variant="body" weight="semibold" color="inverse">
                {t('menuScreen.addFoodAction')}
              </Text>
            </Pressable>
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
    paddingTop: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p120,
    gap: theme.metrics.spacingV.p16,
  },
  screen: {
    gap: theme.metrics.spacingV.p16,
  },
  dateCard: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.xl,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p8,
  },
  sheetBackground: {
    backgroundColor: theme.colors.background.elevated,
  },
  sheetHandle: {
    backgroundColor: theme.colors.border.default,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p16,
  },
  sheetHeader: {
    alignItems: 'center',
  },
  sheetPickerSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
  },
  sheetPicker: {
    alignSelf: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.metrics.spacing.p12,
  },
  bottomSafeArea: {
    flex: 0,
  },
  energyCard: {
    gap: theme.metrics.spacingV.p12,
  },
  energyHeader: {
    gap: theme.metrics.spacingV.p4,
  },
  energyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p4,
    flexWrap: 'wrap',
  },
  energyGoalLabel: {
    marginLeft: 'auto',
  },
  filterCard: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  filterPill: {
    flex: 1,
    minHeight: theme.metrics.spacing.p48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.input,
  },
  filterPillActive: {
    backgroundColor: theme.colors.brand.primaryVariant,
  },
  sectionHeader: {
    marginTop: theme.metrics.spacingV.p4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  itemCardWrap: {
    marginTop: theme.metrics.spacingV.p12,
  },
  sectionSpacer: {
    height: theme.metrics.spacingV.p20,
  },
  footer: {
    marginTop: theme.metrics.spacingV.p8,
    marginBottom: theme.metrics.spacingV.p20,
  },
  primaryAction: {
    minHeight: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
    backgroundColor: theme.colors.brand.tertiary,
  },
  emptyState: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'flex-start',
    paddingVertical: theme.metrics.spacingV.p20,
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

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Dialog, IconButton, Input, ScreenContainer, Text } from '@/common/components';
import {
  HomeMealCard,
  type HomeMealCardItem,
  toHomeMealCardItem,
} from '@/features/nutrition/components/HomeMealCard';
import {
  createManualMeal,
  createManualMealItem,
  deleteManualMeal,
  deleteManualMealItem,
  listManualMeals,
  renameManualMeal,
  updateManualMealItem,
  type ManualMeal,
  type ManualMealItem,
  type ManualMealItemInput,
} from '@/features/nutrition/services/manualMealsDatabase';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { UserProfile } from '@/features/nutrition/types';
import { useAppAlert } from '@/providers/app-alert';

interface MenuMealItem extends HomeMealCardItem {
  id: string;
}

interface MenuSection {
  key: string;
  title: string;
  subtitle: string;
  meal: ManualMeal;
  data: MenuMealItem[];
}

interface MealDialogState {
  visible: boolean;
  mode: 'create' | 'rename';
  mealId: string | null;
  name: string;
  error: string | null;
}

interface ItemDialogState {
  visible: boolean;
  mode: 'create' | 'edit';
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

const DEFAULT_ITEM_DIALOG_STATE: ItemDialogState = {
  visible: false,
  mode: 'create',
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

function toItemInput(dialogState: ItemDialogState): ManualMealItemInput | null {
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

export default function MenuTab() {
  const { t } = useTranslation();
  const appAlert = useAppAlert();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<ManualMeal[]>([]);
  const [isSavingMealName, setIsSavingMealName] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [mealDialog, setMealDialog] = useState<MealDialogState>({
    visible: false,
    mode: 'create',
    mealId: null,
    name: '',
    error: null,
  });
  const [itemDialog, setItemDialog] = useState<ItemDialogState>(DEFAULT_ITEM_DIALOG_STATE);

  const loadData = useCallback(async () => {
    const [nextProfile, nextMeals] = await Promise.all([getUserProfile(), listManualMeals()]);
    setProfile(nextProfile);
    setMeals(nextMeals);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const sections = useMemo<MenuSection[]>(
    () =>
      meals.map((meal, index) => ({
        key: meal.localId,
        title: meal.name.trim() || t('menuScreen.defaultMealName', { index: index + 1 }),
        subtitle: t('menuScreen.itemCount', { count: meal.items.length }),
        meal,
        data: meal.items.map((item) => ({
          id: item.localId,
          ...toHomeMealCardItem({
            mealName: item.title,
            quantityLabel: item.quantityLabel,
            quantityGrams: item.quantityGrams,
            totalCalories: item.totalCalories * item.servings,
            proteinGrams: item.proteinGrams * item.servings,
            carbsGrams: item.carbsGrams * item.servings,
            fatGrams: item.fatGrams * item.servings,
            isFavorite: false,
          }),
        })),
      })),
    [meals, t]
  );

  const totalCalories = useMemo(
    () =>
      meals.reduce((sum, meal) => {
        return sum + meal.totalCalories;
      }, 0),
    [meals]
  );

  const openCreateMealDialog = useCallback(() => {
    setMealDialog({
      visible: true,
      mode: 'create',
      mealId: null,
      name: '',
      error: null,
    });
  }, []);

  const openRenameMealDialog = useCallback((meal: ManualMeal) => {
    setMealDialog({
      visible: true,
      mode: 'rename',
      mealId: meal.localId,
      name: meal.name,
      error: null,
    });
  }, []);

  const closeMealDialog = useCallback(() => {
    setMealDialog((previous) => ({ ...previous, visible: false, error: null }));
  }, []);

  const saveMealName = useCallback(async () => {
    if (isSavingMealName) {
      return;
    }

    const nextName = mealDialog.name.trim();

    if (!nextName) {
      setMealDialog((previous) => ({
        ...previous,
        error: t('menuScreen.validation.mealNameRequired'),
      }));
      return;
    }

    setIsSavingMealName(true);

    try {
      if (mealDialog.mode === 'create') {
        await createManualMeal(nextName);
      } else if (mealDialog.mealId) {
        await renameManualMeal(mealDialog.mealId, nextName);
      }

      closeMealDialog();
      await loadData();
    } finally {
      setIsSavingMealName(false);
    }
  }, [
    closeMealDialog,
    isSavingMealName,
    loadData,
    mealDialog.mealId,
    mealDialog.mode,
    mealDialog.name,
    t,
  ]);

  const confirmDeleteMeal = useCallback(
    (meal: ManualMeal) => {
      appAlert.alert(
        t('menuScreen.deleteMealTitle'),
        t('menuScreen.deleteMealMessage', { name: meal.name }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void deleteManualMeal(meal.localId).then(() => {
                void loadData();
              });
            },
          },
        ]
      );
    },
    [appAlert, loadData, t]
  );

  const openCreateItemDialog = useCallback(
    (meal: ManualMeal) => {
      setItemDialog({
        ...DEFAULT_ITEM_DIALOG_STATE,
        visible: true,
        mode: 'create',
        mealId: meal.localId,
        quantityLabel: t('menuScreen.defaultQuantityLabel'),
        totalCalories: '0',
        proteinGrams: '0',
        carbsGrams: '0',
        fatGrams: '0',
      });
    },
    [t]
  );

  const openEditItemDialog = useCallback((meal: ManualMeal, item: ManualMealItem) => {
    setItemDialog({
      visible: true,
      mode: 'edit',
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
    if (isSavingItem || !itemDialog.mealId) {
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
      if (itemDialog.mode === 'create') {
        await createManualMealItem(itemDialog.mealId, itemInput);
      } else if (itemDialog.itemId) {
        await updateManualMealItem(itemDialog.itemId, itemInput);
      }

      closeItemDialog();
      await loadData();
    } finally {
      setIsSavingItem(false);
    }
  }, [closeItemDialog, isSavingItem, itemDialog, loadData, t]);

  const confirmDeleteItem = useCallback(
    (item: ManualMealItem) => {
      appAlert.alert(
        t('menuScreen.deleteItemTitle'),
        t('menuScreen.deleteItemMessage', { name: item.title }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void deleteManualMealItem(item.localId).then(() => {
                void loadData();
              });
            },
          },
        ]
      );
    },
    [appAlert, loadData, t]
  );

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text variant="h2">{t('menuScreen.totalCaloriesTitle')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('menuScreen.currentVsTargetCalories', {
                  current: Math.round(totalCalories),
                  target: Math.round(profile?.dailyCalorieTarget ?? 0),
                  kcal: t('common.units.kcal'),
                })}
              </Text>
            </View>
            <Button title={t('menuScreen.addMeal')} size="sm" onPress={openCreateMealDialog} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderMainRow}>
              <View style={styles.sectionHeaderCopy}>
                <Text variant="h3">
                  {t('menuScreen.sectionCalories', {
                    title: section.title,
                    value: Math.round(section.meal.totalCalories),
                    kcal: t('common.units.kcal'),
                  })}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {section.subtitle}
                </Text>
              </View>
              <View style={styles.sectionHeaderActions}>
                <IconButton
                  icon="add"
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={t('menuScreen.addItemAction')}
                  onPress={() => {
                    openCreateItemDialog(section.meal);
                  }}
                />
                <IconButton
                  icon="create-outline"
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={t('menuScreen.renameMealAction')}
                  onPress={() => {
                    openRenameMealDialog(section.meal);
                  }}
                />
                <IconButton
                  icon="trash-outline"
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={t('menuScreen.deleteMealAction')}
                  onPress={() => {
                    confirmDeleteMeal(section.meal);
                  }}
                />
              </View>
            </View>
          </View>
        )}
        renderItem={({ item, section }) => {
          const mealItem = section.meal.items.find((entry) => entry.localId === item.id);

          if (!mealItem) {
            return null;
          }

          return (
            <View style={styles.itemTimelineRow}>
              <View style={styles.itemRail}>
                <View style={styles.itemDot} />
                <View style={styles.itemLine} />
              </View>

              <HomeMealCard.Root item={item} onPress={() => undefined}>
                <HomeMealCard.Preview />
                <HomeMealCard.Content>
                  <HomeMealCard.Header>
                    <HomeMealCard.Actions>
                      <HomeMealCard.ActionButton
                        icon="create-outline"
                        label={t('common.edit')}
                        onPress={() => {
                          openEditItemDialog(section.meal, mealItem);
                        }}
                      />
                      <HomeMealCard.ActionButton
                        icon="trash-outline"
                        label={t('common.delete')}
                        tone="danger"
                        onPress={() => {
                          confirmDeleteItem(mealItem);
                        }}
                      />
                    </HomeMealCard.Actions>
                  </HomeMealCard.Header>
                  <HomeMealCard.Macros />
                </HomeMealCard.Content>
              </HomeMealCard.Root>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="h3">{t('menuScreen.emptyTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('menuScreen.emptySubtitle')}
            </Text>
            <Button title={t('menuScreen.addMeal')} onPress={openCreateMealDialog} />
          </View>
        }
        SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
      />

      <Dialog
        visible={mealDialog.visible}
        onDismiss={closeMealDialog}
        title={
          mealDialog.mode === 'create'
            ? t('menuScreen.createMealTitle')
            : t('menuScreen.renameMealTitle')
        }
        actions={[
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: closeMealDialog,
          },
          {
            label: isSavingMealName ? t('common.loading') : t('common.save'),
            variant: 'primary',
            onPress: () => {
              void saveMealName();
            },
          },
        ]}
      >
        <Input
          label={t('menuScreen.mealNameLabel')}
          value={mealDialog.name}
          onChangeText={(value) => {
            setMealDialog((previous) => ({
              ...previous,
              name: value,
              error: null,
            }));
          }}
          placeholder={t('menuScreen.mealNamePlaceholder')}
          error={mealDialog.error ?? undefined}
        />
      </Dialog>

      <Dialog
        visible={itemDialog.visible}
        onDismiss={closeItemDialog}
        title={
          itemDialog.mode === 'create'
            ? t('menuScreen.addItemTitle')
            : t('menuScreen.editItemTitle')
        }
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
            placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
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
                placeholder="0"
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
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p32,
    gap: theme.metrics.spacingV.p12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p20,
  },
  pageHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeader: {
    marginBottom: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeaderMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  itemTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p8,
    paddingLeft: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p12,
  },
  itemRail: {
    width: theme.metrics.spacing.p20,
    alignItems: 'center',
    paddingTop: theme.metrics.spacingV.p12,
  },
  itemDot: {
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.state.success,
  },
  itemLine: {
    width: 2,
    flex: 1,
    marginTop: theme.metrics.spacingV.p4,
    backgroundColor: theme.colors.state.infoBg,
  },
  sectionSpacer: {
    height: theme.metrics.spacingV.p12,
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

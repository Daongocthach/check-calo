import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Button, Card, Chip, Icon, Switch, Text, TextArea } from '@/common/components';
import {
  createManualMealItem,
  ensureDefaultManualMealsForWeek,
  listManualMealsPage,
  type ManualMeal,
} from '@/features/nutrition/services/manualMealsDatabase';
import {
  generateMockAiMealPlanSuggestions,
  type MealPlanCriterion,
  type MockAiMealPlanSuggestion,
} from '@/features/nutrition/services/mockAiMealPlanApi';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import type { MealType } from '@/features/nutrition/types';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { toast } from '@/utils/toast';
import { styles } from './MealPlanSuggestionSheet.styles';

interface MealPlanSuggestionSheetProps {
  onClose: () => void;
}

const DEFAULT_CRITERIA: MealPlanCriterion[] = [];
const MEAL_PLAN_PAGE_SIZE = 20;

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = startOfDay(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function getMealTypeLabel(t: (key: string) => string, mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return t('homeScreen.meals.breakfast');
    case 'lunch':
      return t('homeScreen.meals.lunch');
    case 'dinner':
      return t('homeScreen.meals.dinner');
    case 'snack':
      return t('homeScreen.meals.snack');
    default:
      return t('homeScreen.meals.other');
  }
}

export function MealPlanSuggestionSheet({ onClose }: MealPlanSuggestionSheetProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useUnistyles();
  const { openSheet, closeSheet } = useAppBottomSheet();
  const sheetState = useMealPlanSuggestionSheetStore((state) => state.sheetState);
  const payload = useMealPlanSuggestionSheetStore((state) => state.payload);
  const markGenerated = useMealPlanSuggestionSheetStore((state) => state.markGenerated);
  const setSheetState = useMealPlanSuggestionSheetStore((state) => state.setSheetState);
  const [preferRecentFoods, setPreferRecentFoods] = useState(true);
  const [availableIngredients, setAvailableIngredients] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [criteria, setCriteria] = useState<MealPlanCriterion[]>(DEFAULT_CRITERIA);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<MockAiMealPlanSuggestion[]>([]);
  const [dayMeals, setDayMeals] = useState<ManualMeal[]>([]);
  const [addedMealTypes, setAddedMealTypes] = useState<MealType[]>([]);
  const [sheetView, setSheetView] = useState<'options' | 'results'>('options');
  const [lastSheetView, setLastSheetView] = useState<'options' | 'results'>('options');

  useEffect(() => {
    if (sheetState === 'opening') {
      setPreferRecentFoods(true);
      setAvailableIngredients('');
      setContraindications('');
      setCriteria(DEFAULT_CRITERIA);
      setIsGenerating(false);
      setIsAddingAll(false);
      setAddingMealType(null);
      setGeneratedSuggestions([]);
      setDayMeals([]);
      setAddedMealTypes([]);
      setSheetView('options');
      setLastSheetView('options');
    }
  }, [sheetState]);

  const handleDismiss = useCallback(() => {
    setSheetState('closed');
    onClose();
  }, [onClose, setSheetState]);

  const toggleCriterion = useCallback((criterion: MealPlanCriterion) => {
    setCriteria((current) =>
      current.includes(criterion)
        ? current.filter((item) => item !== criterion)
        : [...current, criterion]
    );
  }, []);

  const findTargetMeal = useCallback(
    (mealType: MealType) => {
      if (payload?.mealLocalId) {
        return dayMeals.find((meal) => meal.localId === payload.mealLocalId) ?? null;
      }

      return dayMeals.find((meal) => meal.mealType === mealType) ?? null;
    },
    [dayMeals, payload?.mealLocalId]
  );

  const criterionOptions = useMemo(
    () => [
      {
        value: 'quick' as const,
        label: t('menuScreen.aiForm.criteria.quick'),
        iconName: 'flash-outline' as const,
      },
      {
        value: 'cheap' as const,
        label: t('menuScreen.aiForm.criteria.cheap'),
        iconName: 'wallet-outline' as const,
      },
      {
        value: 'satiating' as const,
        label: t('menuScreen.aiForm.criteria.satiating'),
        iconName: 'restaurant-outline' as const,
      },
      {
        value: 'protein' as const,
        label: t('menuScreen.aiForm.criteria.protein'),
        iconName: 'fitness-outline' as const,
      },
    ],
    [t]
  );

  const handleGenerate = useCallback(async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setIsAddingAll(false);
    setAddingMealType(null);

    try {
      const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());
      const selectedDayStart = startOfDay(selectedDate);
      const selectedDayEnd = endOfDay(selectedDate);

      await ensureDefaultManualMealsForWeek(selectedDayStart);

      const [profile, mealsPage] = await Promise.all([
        getUserProfile(),
        listManualMealsPage({
          page: 1,
          pageSize: MEAL_PLAN_PAGE_SIZE,
          startDate: selectedDayStart,
          endDate: selectedDayEnd,
        }),
      ]);
      setDayMeals(mealsPage.items);
      const suggestions = await generateMockAiMealPlanSuggestions({
        selectedDateIso: selectedDayStart.toISOString(),
        targetMealType: payload?.mealType,
        preferRecentFoods,
        availableIngredients,
        contraindications,
        criteria,
        profile,
        locale: i18n.language,
      });
      setGeneratedSuggestions(suggestions);
      setAddedMealTypes([]);
      markGenerated();
      setLastSheetView('options');
      setSheetView('results');
      toast.success(t('menuScreen.aiForm.generated', { count: suggestions.length }));
    } catch {
      toast.error(t('menuScreen.aiForm.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [
    availableIngredients,
    contraindications,
    criteria,
    i18n.language,
    isGenerating,
    markGenerated,
    payload?.mealType,
    payload?.selectedDateIso,
    preferRecentFoods,
    t,
  ]);

  const handleAddSuggestion = useCallback(
    async (suggestion: MockAiMealPlanSuggestion) => {
      if (addingMealType !== null || isAddingAll) {
        return;
      }

      if (addedMealTypes.includes(suggestion.mealType)) {
        return;
      }

      const matchedMeal = findTargetMeal(suggestion.mealType);
      if (!matchedMeal) {
        toast.info(t('menuScreen.aiForm.noMealFound'));
        return;
      }

      setAddingMealType(suggestion.mealType);

      try {
        await createManualMealItem(matchedMeal.localId, suggestion.item);
        setAddedMealTypes((current) =>
          current.includes(suggestion.mealType) ? current : [...current, suggestion.mealType]
        );
        markGenerated();
        toast.success(t('menuScreen.aiForm.addedOne'));
      } catch {
        toast.error(t('menuScreen.aiForm.addFailed'));
      } finally {
        setAddingMealType(null);
      }
    },
    [addingMealType, addedMealTypes, findTargetMeal, isAddingAll, markGenerated, t]
  );

  const handleAddAllSuggestions = useCallback(async () => {
    if (isGenerating || isAddingAll || generatedSuggestions.length === 0) {
      return;
    }

    setIsAddingAll(true);
    setAddingMealType(null);

    try {
      let addedCount = 0;
      let skippedCount = 0;

      for (const suggestion of generatedSuggestions) {
        if (addedMealTypes.includes(suggestion.mealType)) {
          skippedCount += 1;
          continue;
        }

        const matchedMeal = findTargetMeal(suggestion.mealType);
        if (!matchedMeal) {
          skippedCount += 1;
          continue;
        }

        await createManualMealItem(matchedMeal.localId, suggestion.item);
        addedCount += 1;
      }

      if (addedCount === 0) {
        toast.info(t('menuScreen.aiForm.noMealFound'));
        return;
      }

      markGenerated();
      setAddedMealTypes((current) => [
        ...new Set([
          ...current,
          ...generatedSuggestions
            .filter((suggestion) => !current.includes(suggestion.mealType))
            .map((suggestion) => suggestion.mealType),
        ]),
      ]);
      toast.success(
        skippedCount > 0
          ? t('menuScreen.aiForm.addedWithSkipped', { count: addedCount, skipped: skippedCount })
          : t('menuScreen.aiForm.addedAll', { count: addedCount })
      );
    } catch {
      toast.error(t('menuScreen.aiForm.addFailed'));
    } finally {
      setIsAddingAll(false);
    }
  }, [
    addedMealTypes,
    findTargetMeal,
    generatedSuggestions,
    isAddingAll,
    isGenerating,
    markGenerated,
    t,
  ]);

  let primaryActionTitle = t('menuScreen.aiForm.generateAction');
  if (generatedSuggestions.length > 0) {
    primaryActionTitle = t('menuScreen.aiForm.regenerateAction');
  }
  if (isGenerating) {
    primaryActionTitle = t('menuScreen.aiForm.generating');
  }

  const handleViewMoreRecentFoods = useCallback(() => {
    closeSheet();
    router.push('/recently-food');
  }, [closeSheet, router]);

  const handleBackToOptions = useCallback(() => {
    setLastSheetView('results');
    setSheetView('options');
  }, []);

  const handleReturnToResults = useCallback(() => {
    if (generatedSuggestions.length === 0) {
      return;
    }

    setLastSheetView('options');
    setSheetView('results');
  }, [generatedSuggestions.length]);

  const sheetContent = useMemo(() => {
    if (sheetView === 'results') {
      return (
        <View style={styles.sheetContent}>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsHeaderCopy}>
              <Text variant="h3">{t('menuScreen.aiForm.resultsTitle')}</Text>
              <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
                {t('menuScreen.aiForm.resultsSubtitle')}
              </Text>
            </View>
            <Button
              title={t('common.back')}
              variant="ghost"
              size="sm"
              leftIcon={
                <Icon name="chevron-back-outline" size={16} color={theme.colors.text.primary} />
              }
              onPress={handleBackToOptions}
            />
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text variant="body" weight="bold">
                  {t('menuScreen.aiForm.suggestionListTitle')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('menuScreen.aiForm.suggestionListHint')}
                </Text>
              </View>
              {generatedSuggestions.length > 0 ? (
                <Text variant="caption" color="secondary">
                  {t('menuScreen.aiForm.suggestionCount', { count: generatedSuggestions.length })}
                </Text>
              ) : null}
            </View>

            {generatedSuggestions.length > 0 ? (
              <View style={styles.suggestionList}>
                {generatedSuggestions.map((suggestion) => {
                  const isAdded = addedMealTypes.includes(suggestion.mealType);
                  const isAdding = addingMealType === suggestion.mealType;
                  const mealLabel = getMealTypeLabel(
                    t as unknown as (key: string) => string,
                    suggestion.mealType
                  );
                  const suggestionSubtitle = `${suggestion.item.quantityLabel} · ${suggestion.item.totalCalories} ${t(
                    'common.units.kcal'
                  )}`;
                  let suggestionActionLabel = t('menuScreen.aiForm.addOne');
                  if (isAdded) {
                    suggestionActionLabel = t('menuScreen.aiForm.added');
                  } else if (isAdding) {
                    suggestionActionLabel = t('common.loading');
                  }

                  return (
                    <Card
                      key={suggestion.mealType}
                      variant="outlined"
                      style={styles.suggestionCard}
                    >
                      <View style={styles.suggestionHeader}>
                        <View style={styles.suggestionHeaderCopy}>
                          <Text variant="bodySmall" weight="semibold" color="secondary">
                            {mealLabel}
                          </Text>
                          <Text variant="body" weight="bold">
                            {suggestion.item.title}
                          </Text>
                          <Text variant="caption" color="secondary">
                            {suggestionSubtitle}
                          </Text>
                        </View>
                        {isAdded ? (
                          <Chip label={t('menuScreen.aiForm.added')} variant="solid" selected />
                        ) : null}
                      </View>

                      {suggestion.item.notes ? (
                        <Text variant="bodySmall" color="secondary">
                          {suggestion.item.notes}
                        </Text>
                      ) : null}

                      <View style={styles.suggestionActions}>
                        <Button
                          title={suggestionActionLabel}
                          variant="outline"
                          size="sm"
                          loading={isAdding}
                          disabled={isAdded || isAdding || isAddingAll}
                          onPress={() => {
                            void handleAddSuggestion(suggestion);
                          }}
                        />
                        <Button
                          title={t('menuScreen.aiForm.addWholeMeal')}
                          variant="ghost"
                          size="sm"
                          disabled={isAdded || isAdding || isAddingAll}
                          onPress={() => {
                            void handleAddSuggestion(suggestion);
                          }}
                        />
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card variant="outlined" style={styles.emptySuggestionCard}>
                <Text variant="bodySmall" weight="semibold">
                  {t('menuScreen.aiForm.draftEmpty')}
                </Text>
                <Text variant="caption" color="secondary">
                  {t('menuScreen.aiForm.draftEmptyHint')}
                </Text>
              </Card>
            )}
          </View>

          <View style={styles.actions}>
            <View style={styles.actionsSpacer} />
            {generatedSuggestions.length > 0 ? (
              <Button
                title={t('menuScreen.aiForm.addAllToMenu')}
                variant="outline"
                disabled={isGenerating || isAddingAll}
                loading={isAddingAll}
                onPress={() => {
                  void handleAddAllSuggestions();
                }}
              />
            ) : null}
            <Button
              title={t('common.close')}
              variant="outline"
              disabled={isGenerating || isAddingAll}
              onPress={() => {
                closeSheet();
              }}
            />
            {lastSheetView === 'results' && generatedSuggestions.length > 0 ? (
              <Button
                title={t('menuScreen.aiForm.backToResults')}
                variant="ghost"
                disabled={isGenerating || isAddingAll}
                onPress={() => {
                  void handleReturnToResults();
                }}
              />
            ) : null}
            <Button
              title={primaryActionTitle}
              variant="primary"
              loading={isGenerating}
              disabled={isAddingAll}
              onPress={() => {
                void handleGenerate();
              }}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sheetContent}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text variant="h3">{t('menuScreen.aiForm.title')}</Text>
            <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
              {t('menuScreen.aiForm.subtitle')}
            </Text>
          </View>
          <View style={styles.sparkleGroup} pointerEvents="none">
            <Icon name="sparkles-outline" size={24} color={theme.colors.brand.primaryVariant} />
          </View>
        </View>

        <View style={styles.switchCard}>
          <View style={styles.switchCopy}>
            <Text variant="body" weight="semibold">
              {t('menuScreen.aiForm.recentLabel')}
            </Text>
            <Text variant="caption" color="secondary">
              {t('menuScreen.aiForm.recentHint')}
            </Text>
          </View>
          <View style={styles.switchActions}>
            <Switch value={preferRecentFoods} onValueChange={setPreferRecentFoods} />
            <Button
              title={t('menuScreen.aiForm.recentViewMore')}
              variant="ghost"
              size="sm"
              rightIcon={
                <Icon name="chevron-forward" size={16} color={theme.colors.brand.primary} />
              }
              onPress={handleViewMoreRecentFoods}
              style={styles.recentViewMoreButton}
            />
          </View>
        </View>

        <TextArea
          label={t('menuScreen.aiForm.ingredientsLabel')}
          value={availableIngredients}
          onChangeText={setAvailableIngredients}
          placeholder={t('menuScreen.aiForm.ingredientsPlaceholder')}
          numberOfLines={4}
        />

        <TextArea
          label={t('menuScreen.aiForm.contraindicationsLabel')}
          value={contraindications}
          onChangeText={setContraindications}
          placeholder={t('menuScreen.aiForm.contraindicationsPlaceholder')}
          numberOfLines={4}
        />

        <View style={styles.sectionBlock}>
          <Text variant="body" weight="bold">
            {t('menuScreen.aiForm.criteriaLabel')}
          </Text>
          <Text variant="caption" color="secondary">
            {t('menuScreen.aiForm.criteriaHint')}
          </Text>
          <View style={styles.chipWrap}>
            {criterionOptions.map((criterion) => (
              <Chip
                key={criterion.value}
                text={criterion.label}
                icon={
                  <Icon
                    name={criterion.iconName}
                    size={14}
                    variant={criteria.includes(criterion.value) ? 'inverse' : 'secondary'}
                  />
                }
                selected={criteria.includes(criterion.value)}
                onPress={() => {
                  toggleCriterion(criterion.value);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionsSpacer} />
          <Button
            title={t('common.cancel')}
            variant="outline"
            disabled={isGenerating || isAddingAll}
            onPress={() => {
              closeSheet();
            }}
          />
          <Button
            title={primaryActionTitle}
            variant="primary"
            loading={isGenerating}
            disabled={isAddingAll}
            onPress={() => {
              void handleGenerate();
            }}
          />
        </View>
      </View>
    );
  }, [
    addedMealTypes,
    addingMealType,
    availableIngredients,
    closeSheet,
    contraindications,
    criteria,
    criterionOptions,
    generatedSuggestions,
    handleAddAllSuggestions,
    handleAddSuggestion,
    handleBackToOptions,
    handleGenerate,
    handleViewMoreRecentFoods,
    handleReturnToResults,
    isAddingAll,
    isGenerating,
    preferRecentFoods,
    lastSheetView,
    primaryActionTitle,
    sheetView,
    t,
    theme.colors.brand.primary,
    theme.colors.brand.primaryVariant,
    theme.colors.text.primary,
    toggleCriterion,
  ]);

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

  return null;
}

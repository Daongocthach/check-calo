import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Button, Card, Icon, Loading, Text } from '@/common/components';
import { NutritionReviewSheet } from '@/features/nutrition/components/NutritionReviewSheet/NutritionReviewSheet';
import {
  analyzeHomeNutritionWithGemini,
  type HomeNutritionReviewDraft,
} from '@/features/nutrition/services/geminiHomeNutritionReview';
import {
  ensureDefaultManualMealsForWeek,
  listManualMealsPage,
  type ManualMeal,
} from '@/features/nutrition/services/manualMealsDatabase';
import {
  getLatestMenuAiReviewHistoryRecord,
  getMenuAiReviewHistoryRecords,
  saveMenuAiReviewHistoryRecord,
  type MenuAiReviewHistoryRecord,
} from '@/features/nutrition/services/menuAiReviewHistoryStorage';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import type { MealType } from '@/features/nutrition/types';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { styles } from './MealPlanSuggestionSheet.styles';

interface MealPlanSuggestionSheetProps {
  onClose: () => void;
}

interface MealPlanReviewContentProps {
  payload: {
    selectedDateIso: string;
    mealLocalId?: string;
    mealType?: MealType;
  } | null;
  onClose: () => void;
}

interface ReviewStateIdle {
  status: 'idle';
}

interface ReviewStateLoading {
  status: 'loading';
}

interface ReviewStateReady {
  status: 'ready';
  review: HomeNutritionReviewDraft;
  assistantMessage: string | null;
  reviewedMealCount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface ReviewStateNeedsAttention {
  status: 'need_more_info' | 'unsupported' | 'error';
  message: string;
}

type ReviewState =
  | ReviewStateIdle
  | ReviewStateLoading
  | ReviewStateReady
  | ReviewStateNeedsAttention;

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

function formatMealTimeLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getMealTitle(t: TFunction, mealType: MealType) {
  switch (mealType) {
    case 'breakfast':
      return t('menuScreen.review.breakfast');
    case 'lunch':
      return t('menuScreen.review.lunch');
    case 'dinner':
      return t('menuScreen.review.dinner');
    case 'snack':
      return t('menuScreen.review.snack');
    default:
      return t('menuScreen.review.mealAction');
  }
}

function groupHistoryRecords(records: MenuAiReviewHistoryRecord[]) {
  const grouped = new Map<string, MenuAiReviewHistoryRecord[]>();

  for (const record of records) {
    const list = grouped.get(record.reviewDateKey);
    if (list) {
      list.push(record);
    } else {
      grouped.set(record.reviewDateKey, [record]);
    }
  }

  return Array.from(grouped.entries()).map(([dateKey, items]) => ({
    dateKey,
    items,
  }));
}

function getRecordTitle(record: MenuAiReviewHistoryRecord, t: TFunction) {
  if (record.reviewScope === 'meal' && record.mealName) {
    return t('menuScreen.review.historyMealTitle', { name: record.mealName });
  }

  return t('menuScreen.review.title');
}

function MealPlanReviewContent({ payload, onClose }: MealPlanReviewContentProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();

  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'loading' });
  const [dayMeals, setDayMeals] = useState<ManualMeal[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<MenuAiReviewHistoryRecord[]>([]);
  const didInitializeRef = useRef(false);

  const refreshHistory = useCallback(() => {
    setHistoryRecords(getMenuAiReviewHistoryRecords());
  }, []);

  const loadMealsForSelectedDay = useCallback(async () => {
    const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());
    const selectedDayStart = startOfDay(selectedDate);
    const selectedDayEnd = endOfDay(selectedDate);

    await ensureDefaultManualMealsForWeek(selectedDayStart);

    const mealsPage = await listManualMealsPage({
      page: 1,
      pageSize: MEAL_PLAN_PAGE_SIZE,
      startDate: selectedDayStart,
      endDate: selectedDayEnd,
    });

    const selectedMeals = payload?.mealLocalId
      ? mealsPage.items.filter((meal) => meal.localId === payload.mealLocalId)
      : mealsPage.items;

    setDayMeals(selectedMeals);
    setSelectedMealType(
      payload?.mealType && payload.mealType !== 'other' ? payload.mealType : null
    );
    return selectedMeals;
  }, [payload?.mealLocalId, payload?.mealType, payload?.selectedDateIso]);

  const buildReviewContext = useCallback(
    (meals: ManualMeal[]) => {
      const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());
      const selectedDateLabel = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'full',
      }).format(selectedDate);

      const reviewedMeals = meals.slice(0, 12);
      const entries = reviewedMeals.map((meal) => ({
        timeLabel: formatMealTimeLabel(meal.eatenAt, i18n.language),
        mealName: meal.name,
        calories: Math.round(meal.totalCalories),
        proteinGrams: Math.round(meal.totalProteinGrams),
        carbsGrams: Math.round(meal.totalCarbsGrams),
        fatGrams: Math.round(meal.totalFatGrams),
        quantityLabel: t('menuScreen.review.mealItemCount', { count: meal.items.length }),
      }));

      return {
        selectedDateLabel,
        selectedDateIso: selectedDate.toISOString(),
        summary: reviewedMeals.reduce(
          (totals, meal) => ({
            consumedCalories: totals.consumedCalories + Math.round(meal.totalCalories),
            calorieTarget: totals.calorieTarget,
            remainingCalories: totals.remainingCalories - Math.round(meal.totalCalories),
            progressPercent: totals.progressPercent,
            proteinGrams: totals.proteinGrams + Math.round(meal.totalProteinGrams),
            carbsGrams: totals.carbsGrams + Math.round(meal.totalCarbsGrams),
            fatGrams: totals.fatGrams + Math.round(meal.totalFatGrams),
          }),
          {
            consumedCalories: 0,
            calorieTarget: 0,
            remainingCalories: 0,
            progressPercent: 0,
            proteinGrams: 0,
            carbsGrams: 0,
            fatGrams: 0,
          }
        ),
        entries,
        locale: i18n.language,
      };
    },
    [i18n.language, payload?.selectedDateIso, t]
  );

  const persistReviewHistory = useCallback(
    (input: {
      status: 'ready' | 'need_more_info' | 'unsupported' | 'error';
      review: HomeNutritionReviewDraft | null;
      assistantMessage: string | null;
      meals: ManualMeal[];
    }) => {
      const reviewDate = new Date(payload?.selectedDateIso ?? Date.now());
      saveMenuAiReviewHistoryRecord({
        reviewDate,
        status: input.status,
        review: input.review,
        assistantMessage: input.assistantMessage,
        reviewScope: input.meals.length === 1 ? 'meal' : 'day',
        mealLocalId: input.meals.length === 1 && input.meals[0] ? input.meals[0].localId : null,
        mealName: input.meals.length === 1 && input.meals[0] ? input.meals[0].name : null,
      });
      refreshHistory();
    },
    [payload?.selectedDateIso, refreshHistory]
  );

  const runReview = useCallback(
    async (mealList?: ManualMeal[]) => {
      const meals = mealList ?? (dayMeals.length > 0 ? dayMeals : await loadMealsForSelectedDay());

      if (meals.length === 0) {
        const message = t('menuScreen.review.emptySubtitle');
        setReviewState({
          status: 'need_more_info',
          message,
        });
        persistReviewHistory({
          status: 'need_more_info',
          review: null,
          assistantMessage: message,
          meals,
        });
        return;
      }

      setReviewState({ status: 'loading' });

      try {
        const result = await analyzeHomeNutritionWithGemini(buildReviewContext(meals));
        const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());

        if (result.status === 'ready') {
          const totals = meals.reduce(
            (accumulator, meal) => ({
              calories: accumulator.calories + Math.round(meal.totalCalories),
              protein: accumulator.protein + Math.round(meal.totalProteinGrams),
              carbs: accumulator.carbs + Math.round(meal.totalCarbsGrams),
              fat: accumulator.fat + Math.round(meal.totalFatGrams),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          setReviewState({
            status: 'ready',
            review: result.review,
            assistantMessage: result.assistantMessage,
            reviewedMealCount: meals.length,
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
          });

          saveMenuAiReviewHistoryRecord({
            reviewDate: selectedDate,
            status: 'ready',
            review: result.review,
            assistantMessage: result.assistantMessage,
            reviewScope: meals.length === 1 ? 'meal' : 'day',
            mealLocalId: meals.length === 1 && meals[0] ? meals[0].localId : null,
            mealName: meals.length === 1 && meals[0] ? meals[0].name : null,
          });
          refreshHistory();
          return;
        }

        if (result.status === 'unsupported') {
          const message = result.assistantMessage ?? t('menuScreen.review.unsupportedTitle');
          setReviewState({
            status: 'unsupported',
            message,
          });
          persistReviewHistory({
            status: 'unsupported',
            review: null,
            assistantMessage: message,
            meals,
          });
          return;
        }

        const message = result.assistantMessage ?? t('menuScreen.review.generateNeedMoreInfo');
        setReviewState({
          status: 'need_more_info',
          message,
        });
        persistReviewHistory({
          status: 'need_more_info',
          review: null,
          assistantMessage: message,
          meals,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('menuScreen.review.generateFailed');
        setReviewState({
          status: 'error',
          message,
        });
        persistReviewHistory({
          status: 'error',
          review: null,
          assistantMessage: message,
          meals,
        });
      }
    },
    [
      buildReviewContext,
      dayMeals,
      loadMealsForSelectedDay,
      payload?.selectedDateIso,
      persistReviewHistory,
      refreshHistory,
      t,
    ]
  );

  useEffect(() => {
    if (didInitializeRef.current) {
      return;
    }

    didInitializeRef.current = true;
    refreshHistory();
    setIsHistoryMode(false);
    setReviewState({ status: 'loading' });

    const latestRecord = payload?.selectedDateIso
      ? getLatestMenuAiReviewHistoryRecord(new Date(payload.selectedDateIso))
      : null;

    void loadMealsForSelectedDay().then((meals) => {
      if (
        latestRecord &&
        (!payload?.mealLocalId || latestRecord.mealLocalId === payload.mealLocalId)
      ) {
        if (latestRecord.status === 'ready' && latestRecord.review) {
          const totals = meals.reduce(
            (accumulator, meal) => ({
              calories: accumulator.calories + Math.round(meal.totalCalories),
              protein: accumulator.protein + Math.round(meal.totalProteinGrams),
              carbs: accumulator.carbs + Math.round(meal.totalCarbsGrams),
              fat: accumulator.fat + Math.round(meal.totalFatGrams),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          setReviewState({
            status: 'ready',
            review: latestRecord.review,
            assistantMessage: latestRecord.assistantMessage,
            reviewedMealCount: meals.length,
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
          });
          return;
        }

        if (latestRecord.status === 'unsupported') {
          setReviewState({
            status: 'unsupported',
            message: latestRecord.assistantMessage ?? t('menuScreen.review.unsupportedTitle'),
          });
          return;
        }

        if (latestRecord.status === 'need_more_info') {
          setReviewState({
            status: 'need_more_info',
            message: latestRecord.assistantMessage ?? t('menuScreen.review.generateNeedMoreInfo'),
          });
          return;
        }
      }

      void runReview(meals);
    });
  }, [
    loadMealsForSelectedDay,
    payload?.mealLocalId,
    payload?.selectedDateIso,
    refreshHistory,
    runReview,
    t,
  ]);

  const historySections = useMemo(() => groupHistoryRecords(historyRecords), [historyRecords]);

  const reviewTitle = useMemo(() => {
    if (selectedMealType) {
      return getMealTitle(t, selectedMealType);
    }

    return t('menuScreen.review.title');
  }, [selectedMealType, t]);

  const reviewDateLabel = useMemo(() => {
    const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
    }).format(selectedDate);
  }, [i18n.language, payload?.selectedDateIso]);

  const openReviewRecord = useCallback(
    (record: MenuAiReviewHistoryRecord) => {
      if (record.review) {
        setReviewState({
          status: 'ready',
          review: record.review,
          assistantMessage: record.assistantMessage,
          reviewedMealCount: 0,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
        });
        setIsHistoryMode(false);
        return;
      }

      if (record.status === 'error') {
        setReviewState({
          status: 'error',
          message: record.assistantMessage ?? t('menuScreen.review.generateFailed'),
        });
        setIsHistoryMode(false);
        return;
      }

      if (record.status === 'unsupported') {
        setReviewState({
          status: 'unsupported',
          message: record.assistantMessage ?? t('menuScreen.review.unsupportedTitle'),
        });
      } else {
        setReviewState({
          status: 'need_more_info',
          message: record.assistantMessage ?? t('menuScreen.review.generateNeedMoreInfo'),
        });
      }

      setIsHistoryMode(false);
    },
    [t]
  );

  return (
    <NutritionReviewSheet
      title={t('menuScreen.review.title')}
      subtitle={t('menuScreen.review.subtitle')}
      iconColor={theme.colors.brand.primaryVariant}
      headerActions={
        !isHistoryMode ? (
          <Button
            title={t('menuScreen.review.history')}
            variant="ghost"
            size="sm"
            rightIcon={
              <Icon name="chevron-forward-outline" size={16} color={theme.colors.brand.primary} />
            }
            onPress={() => {
              refreshHistory();
              setIsHistoryMode(true);
            }}
          />
        ) : null
      }
      headerMeta={
        isHistoryMode ? (
          <View style={styles.reviewHistoryHeaderRow}>
            <View style={styles.reviewDatePill}>
              <Text variant="caption" weight="semibold" color="secondary">
                {reviewDateLabel}
              </Text>
            </View>
            <Button
              title={t('menuScreen.review.backToReview')}
              variant="ghost"
              size="sm"
              leftIcon={
                <Icon name="chevron-back-outline" size={16} color={theme.colors.text.primary} />
              }
              onPress={() => {
                setIsHistoryMode(false);
              }}
            />
          </View>
        ) : null
      }
      badge={
        selectedMealType && !isHistoryMode ? (
          <View style={styles.switchCard}>
            <View style={styles.switchCopy}>
              <Text variant="bodySmall" weight="semibold">
                {t('menuScreen.review.reviewingMeal')}
              </Text>
              <Text variant="caption" color="secondary">
                {reviewTitle}
              </Text>
            </View>
          </View>
        ) : null
      }
      footerActions={
        !isHistoryMode ? (
          <>
            <Button
              title={t('menuScreen.review.regenerateAction')}
              variant="outline"
              size="sm"
              leftIcon={
                <Icon name="sparkles-outline" size={16} color={theme.colors.text.primary} />
              }
              loading={reviewState.status === 'loading'}
              onPress={() => {
                void runReview();
              }}
            />
            <Button
              title={t('common.close')}
              variant="ghost"
              size="sm"
              onPress={() => {
                onClose();
              }}
            />
          </>
        ) : null
      }
    >
      {isHistoryMode ? (
        <View style={styles.reviewResult}>
          {historySections.length > 0 ? (
            historySections.map((section) => (
              <View key={section.dateKey} style={styles.reviewListBlock}>
                <Text variant="bodySmall" weight="bold">
                  {new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                  }).format(new Date(section.dateKey))}
                </Text>
                <View style={styles.reviewBulletList}>
                  {section.items.map((record) => (
                    <Card
                      key={record.id}
                      pressable
                      variant="outlined"
                      style={styles.reviewActionCard}
                      onPress={() => {
                        openReviewRecord(record);
                      }}
                    >
                      <View style={styles.reviewSummaryRow}>
                        <View style={styles.reviewSummaryCopy}>
                          <Text variant="bodySmall" weight="semibold">
                            {getRecordTitle(record, t)}
                          </Text>
                          <Text variant="caption" color="secondary">
                            {record.review
                              ? record.review.summary
                              : (record.assistantMessage ?? '')}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Card variant="outlined" style={styles.emptySuggestionCard}>
              <Text variant="bodySmall" weight="semibold">
                {t('menuScreen.review.historyEmpty')}
              </Text>
            </Card>
          )}
        </View>
      ) : null}

      {!isHistoryMode && reviewState.status === 'loading' ? (
        <Card variant="outlined" style={styles.emptySuggestionCard}>
          <View style={styles.reviewLoadingRow}>
            <Loading size="small" />
            <Text variant="bodySmall" color="secondary">
              {t('menuScreen.review.loading')}
            </Text>
          </View>
        </Card>
      ) : null}

      {!isHistoryMode && reviewState.status === 'ready' ? (
        <View style={styles.reviewResult}>
          <Card variant="outlined" style={styles.reviewSummaryCard}>
            <View style={styles.reviewSummaryRow}>
              <View style={styles.reviewSummaryCopy}>
                <Text variant="body" weight="bold">
                  {reviewState.review.title}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {reviewState.review.summary}
                </Text>
              </View>
              <View style={styles.reviewSummaryBadge}>
                <Text variant="caption" weight="semibold" color="secondary">
                  {t('menuScreen.review.mealsReviewed', {
                    count: reviewState.reviewedMealCount,
                  })}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="outlined" style={styles.reviewStatsCard}>
            <View style={styles.reviewStatsGrid}>
              <ReviewStat
                label={t('statsScreen.macros.protein')}
                value={reviewState.totalProtein}
              />
              <ReviewStat label={t('statsScreen.macros.carbs')} value={reviewState.totalCarbs} />
              <ReviewStat label={t('statsScreen.macros.fat')} value={reviewState.totalFat} />
              <ReviewStat label={t('common.units.kcal')} value={reviewState.totalCalories} />
            </View>
          </Card>

          {reviewState.review.strengths.length > 0 ? (
            <Card variant="outlined" style={styles.reviewListBlock}>
              <View style={styles.reviewListHeader}>
                <Icon
                  name="checkmark-circle-outline"
                  size={22}
                  color={theme.colors.state.success}
                />
                <Text variant="bodySmall" weight="bold" color="primary">
                  {t('homeScreen.aiReview.strengths')}
                </Text>
              </View>
              <View style={styles.reviewBulletList}>
                {reviewState.review.strengths.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.reviewBulletRow}>
                    <View style={[styles.reviewBulletDot, styles.reviewBulletDotSuccess]} />
                    <Text variant="bodySmall" color="secondary" style={styles.reviewBulletText}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {reviewState.review.improvements.length > 0 ? (
            <Card variant="outlined" style={styles.reviewListBlock}>
              <View style={styles.reviewListHeader}>
                <Icon name="warning-outline" size={22} color={theme.colors.state.warning} />
                <Text variant="bodySmall" weight="bold" color="primary">
                  {t('homeScreen.aiReview.improvements')}
                </Text>
              </View>
              <View style={styles.reviewBulletList}>
                {reviewState.review.improvements.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.reviewBulletRow}>
                    <View style={[styles.reviewBulletDot, styles.reviewBulletDotWarning]} />
                    <Text variant="bodySmall" color="secondary" style={styles.reviewBulletText}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {reviewState.review.nextAction ? (
            <Card variant="outlined" style={styles.reviewActionCard}>
              <View style={styles.reviewListHeader}>
                <Icon name="bulb-outline" size={22} color={theme.colors.state.warning} />
                <Text variant="bodySmall" weight="bold" color="primary">
                  {t('homeScreen.aiReview.nextAction')}
                </Text>
              </View>
              <Text variant="bodySmall" color="secondary">
                {reviewState.review.nextAction}
              </Text>
            </Card>
          ) : null}

          {reviewState.assistantMessage ? (
            <Text variant="caption" color="secondary">
              {reviewState.assistantMessage}
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isHistoryMode &&
      (reviewState.status === 'need_more_info' ||
        reviewState.status === 'unsupported' ||
        reviewState.status === 'error') ? (
        <Card variant="outlined" style={styles.emptySuggestionCard}>
          <Text variant="bodySmall" weight="semibold">
            {(() => {
              if (reviewState.status === 'unsupported') {
                return t('menuScreen.review.unsupportedTitle');
              }

              if (reviewState.status === 'need_more_info') {
                return t('menuScreen.review.emptyTitle');
              }

              return t('menuScreen.review.errorTitle');
            })()}
          </Text>
          <Text variant="caption" color="secondary">
            {reviewState.message}
          </Text>
        </Card>
      ) : null}
    </NutritionReviewSheet>
  );
}

export function MealPlanSuggestionSheet({ onClose }: MealPlanSuggestionSheetProps) {
  const { openSheet } = useAppBottomSheet();
  const sheetState = useMealPlanSuggestionSheetStore((state) => state.sheetState);
  const payload = useMealPlanSuggestionSheetStore((state) => state.payload);
  const setSheetState = useMealPlanSuggestionSheetStore((state) => state.setSheetState);
  const openedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    setSheetState('closed');
    onClose();
  }, [onClose, setSheetState]);

  useEffect(() => {
    if (sheetState === 'closed') {
      openedRef.current = false;
      return;
    }

    if (sheetState !== 'opening' || openedRef.current) {
      return;
    }

    openedRef.current = true;

    openSheet(<MealPlanReviewContent payload={payload} onClose={handleDismiss} />, {
      snapPoints: ['100%'],
      containerVariant: 'scroll',
      enablePanDownToClose: true,
      onDismiss: handleDismiss,
    });
  }, [handleDismiss, openSheet, payload, sheetState]);

  return null;
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.reviewStat}>
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="body" weight="bold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

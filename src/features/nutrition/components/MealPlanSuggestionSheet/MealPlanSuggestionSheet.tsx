import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Button, Card, Dialog, Icon, IconButton, Loading, Text } from '@/common/components';
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
  deleteMenuAiReviewHistoryRecord,
  getLatestMenuAiReviewHistoryRecord,
  getMenuAiReviewHistoryRecords,
  saveMenuAiReviewHistoryRecord,
  type MenuAiReviewHistoryRecord,
} from '@/features/nutrition/services/menuAiReviewHistoryStorage';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import { useMealPlanSuggestionSheetStore } from '@/features/nutrition/stores/useMealPlanSuggestionSheetStore';
import type { MealType } from '@/features/nutrition/types';
import { getDailyCalorieGoalState, getWeightGoalMode } from '@/features/nutrition/utils/calorie';
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
  onRequestClose: () => void;
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

type ReviewTone = 'good' | 'warning' | 'attention';

interface ReviewMetric {
  key: 'calories' | 'protein' | 'carbs' | 'fat';
  label: string;
  current: number;
  target: number;
  unit: string;
}

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

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function getGoalModeLabel(t: TFunction, goalMode: ReturnType<typeof getWeightGoalMode>) {
  switch (goalMode) {
    case 'lose':
      return t('menuScreen.review.goalMode.lose');
    case 'gain':
      return t('menuScreen.review.goalMode.gain');
    case 'maintain':
    default:
      return t('menuScreen.review.goalMode.maintain');
  }
}

function getMetricLabel(t: TFunction, key: ReviewMetric['key']) {
  switch (key) {
    case 'calories':
      return t('menuScreen.review.caloriesTitle');
    case 'protein':
      return t('statsScreen.macros.protein');
    case 'carbs':
      return t('statsScreen.macros.carbs');
    case 'fat':
      return t('statsScreen.macros.fat');
  }
}

function MealPlanReviewContent({ payload, onRequestClose }: MealPlanReviewContentProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();

  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'loading' });
  const [dayMeals, setDayMeals] = useState<ManualMeal[]>([]);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getUserProfile>>>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<MenuAiReviewHistoryRecord[]>([]);
  const [deleteTargetRecord, setDeleteTargetRecord] = useState<MenuAiReviewHistoryRecord | null>(
    null
  );
  const didInitializeRef = useRef(false);

  const refreshHistory = useCallback(() => {
    setHistoryRecords(getMenuAiReviewHistoryRecords());
  }, []);

  const loadMealsForSelectedDay = useCallback(async () => {
    const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());
    const selectedDayStart = startOfDay(selectedDate);
    const selectedDayEnd = endOfDay(selectedDate);

    await ensureDefaultManualMealsForWeek(selectedDayStart);

    const [nextProfile, mealsPage] = await Promise.all([
      getUserProfile(),
      listManualMealsPage({
        page: 1,
        pageSize: MEAL_PLAN_PAGE_SIZE,
        startDate: selectedDayStart,
        endDate: selectedDayEnd,
      }),
    ]);

    const selectedMeals = payload?.mealLocalId
      ? mealsPage.items.filter((meal) => meal.localId === payload.mealLocalId)
      : mealsPage.items;

    setProfile(nextProfile);
    setDayMeals(selectedMeals);
    setSelectedMealType(
      payload?.mealType && payload.mealType !== 'other' ? payload.mealType : null
    );
    return selectedMeals;
  }, [payload?.mealLocalId, payload?.mealType, payload?.selectedDateIso]);

  const buildReviewContext = useCallback(
    (meals: ManualMeal[], currentProfile: Awaited<ReturnType<typeof getUserProfile>> | null) => {
      const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());
      const selectedDateLabel = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'full',
      }).format(selectedDate);
      const goalMode = currentProfile
        ? getWeightGoalMode(currentProfile.monthlyWeightGoalKg)
        : 'maintain';
      const goalLabel = currentProfile ? getGoalModeLabel(t, goalMode) : null;

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
        targets: currentProfile
          ? {
              calorieTarget: currentProfile.dailyCalorieTarget,
              proteinTargetGrams: currentProfile.proteinTargetGrams,
              carbsTargetGrams: currentProfile.carbsTargetGrams,
              fatTargetGrams: currentProfile.fatTargetGrams,
            }
          : null,
        goalMode,
        goalLabel,
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
        const currentProfile = profile ?? (await getUserProfile());
        if (!profile) {
          setProfile(currentProfile);
        }

        const result = await analyzeHomeNutritionWithGemini(
          buildReviewContext(meals, currentProfile)
        );
        const selectedDate = new Date(payload?.selectedDateIso ?? Date.now());

        if (result.status === 'ready') {
          setReviewState({
            status: 'ready',
            review: result.review,
            assistantMessage: result.assistantMessage,
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
      profile,
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
          setReviewState({
            status: 'ready',
            review: latestRecord.review,
            assistantMessage: latestRecord.assistantMessage,
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

  const dayTotals = useMemo(
    () =>
      dayMeals.reduce(
        (totals, meal) => ({
          calories: totals.calories + Math.round(meal.totalCalories),
          protein: totals.protein + Math.round(meal.totalProteinGrams),
          carbs: totals.carbs + Math.round(meal.totalCarbsGrams),
          fat: totals.fat + Math.round(meal.totalFatGrams),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [dayMeals]
  );

  const goalMode = useMemo(
    () => (profile ? getWeightGoalMode(profile.monthlyWeightGoalKg) : 'maintain'),
    [profile]
  );

  const heroTone = useMemo<ReviewTone>(() => {
    if (!profile) {
      return 'warning';
    }

    const calorieState = getDailyCalorieGoalState(
      profile,
      profile.dailyCalorieTarget,
      dayTotals.calories
    );
    const proteinProgress =
      profile.proteinTargetGrams > 0 ? dayTotals.protein / profile.proteinTargetGrams : 0;

    if (calorieState === 'on_target' && proteinProgress >= 0.8) {
      return 'good';
    }

    if (calorieState === 'above_target' || proteinProgress < 0.65) {
      return 'attention';
    }

    return 'warning';
  }, [dayTotals.calories, dayTotals.protein, profile]);

  const heroToneLabel = useMemo(() => {
    switch (heroTone) {
      case 'good':
        return t('menuScreen.review.heroStatus.good');
      case 'attention':
        return t('menuScreen.review.heroStatus.attention');
      case 'warning':
      default:
        return t('menuScreen.review.heroStatus.warning');
    }
  }, [heroTone, t]);

  const heroToneIcon = useMemo(() => {
    switch (heroTone) {
      case 'good':
        return 'checkmark-circle-outline';
      case 'attention':
        return 'warning-outline';
      case 'warning':
      default:
        return 'sparkles-outline';
    }
  }, [heroTone]);

  const heroToneColor = useMemo(() => {
    switch (heroTone) {
      case 'good':
        return theme.colors.state.success;
      case 'attention':
        return theme.colors.state.warning;
      case 'warning':
      default:
        return theme.colors.brand.primary;
    }
  }, [
    heroTone,
    theme.colors.brand.primary,
    theme.colors.state.success,
    theme.colors.state.warning,
  ]);

  const metrics = useMemo<ReviewMetric[]>(() => {
    if (!profile || reviewState.status !== 'ready') {
      return [];
    }

    const targetMap = {
      calories: profile.dailyCalorieTarget,
      protein: profile.proteinTargetGrams,
      carbs: profile.carbsTargetGrams,
      fat: profile.fatTargetGrams,
    } as const;

    const currentMap = {
      calories: dayTotals.calories,
      protein: dayTotals.protein,
      carbs: dayTotals.carbs,
      fat: dayTotals.fat,
    } as const;

    const metricKeys: Array<ReviewMetric['key']> = ['calories', 'protein', 'carbs', 'fat'];

    return metricKeys.map((key) => ({
      key,
      label: getMetricLabel(t, key),
      current: currentMap[key],
      target: targetMap[key],
      unit: key === 'calories' ? t('common.units.kcal') : t('common.units.gram'),
    }));
  }, [dayTotals, profile, reviewState.status, t]);

  const activeGoalLabel = useMemo(() => {
    if (!profile) {
      return null;
    }

    return getGoalModeLabel(t, goalMode);
  }, [goalMode, profile, t]);

  const openReviewRecord = useCallback(
    (record: MenuAiReviewHistoryRecord) => {
      if (record.review) {
        setReviewState({
          status: 'ready',
          review: record.review,
          assistantMessage: record.assistantMessage,
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

  const handleConfirmDeleteHistoryRecord = useCallback(() => {
    if (!deleteTargetRecord) {
      return;
    }

    deleteMenuAiReviewHistoryRecord(deleteTargetRecord.id);
    setDeleteTargetRecord(null);
    refreshHistory();
  }, [deleteTargetRecord, refreshHistory]);

  return (
    <NutritionReviewSheet
      title={t('menuScreen.review.title')}
      subtitle={t('menuScreen.review.subtitle')}
      iconColor={theme.colors.brand.primaryVariant}
      headerActions={
        !isHistoryMode ? (
          <View style={styles.headerActionButtons}>
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
          </View>
        ) : null
      }
      headerMeta={
        isHistoryMode ? (
          <View style={styles.reviewHistoryHeaderRow}>
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
                onRequestClose();
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
                    <Card key={record.id} variant="outlined" style={styles.reviewActionCard}>
                      <View style={styles.reviewSummaryRow}>
                        <Button
                          title={getRecordTitle(record, t)}
                          variant="ghost"
                          size="sm"
                          onPress={() => {
                            openReviewRecord(record);
                          }}
                        />
                        <IconButton
                          icon="trash-outline"
                          size="sm"
                          variant="ghost"
                          accessibilityLabel={t('menuScreen.review.deleteHistoryTitle')}
                          onPress={() => {
                            setDeleteTargetRecord(record);
                          }}
                        />
                      </View>
                      <Text variant="caption" color="secondary">
                        {record.review ? record.review.summary : (record.assistantMessage ?? '')}
                      </Text>
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

      <Dialog
        visible={deleteTargetRecord !== null}
        onDismiss={() => {
          setDeleteTargetRecord(null);
        }}
        title={t('menuScreen.review.deleteHistoryTitle')}
        message={t('menuScreen.review.deleteHistoryMessage')}
        actions={[
          {
            label: t('common.cancel'),
            onPress: () => {
              setDeleteTargetRecord(null);
            },
            variant: 'ghost',
          },
          {
            label: t('common.delete'),
            onPress: handleConfirmDeleteHistoryRecord,
            variant: 'outline',
          },
        ]}
      />

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
          <Card variant="outlined" style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View
                style={[
                  styles.heroToneBadge,
                  heroTone === 'good' && styles.heroToneBadgeGood,
                  heroTone === 'warning' && styles.heroToneBadgeWarning,
                  heroTone === 'attention' && styles.heroToneBadgeAttention,
                ]}
              >
                <Icon name={heroToneIcon} size={16} color={heroToneColor} />
                <Text variant="caption" weight="semibold" color="secondary">
                  {heroToneLabel}
                </Text>
              </View>

              {activeGoalLabel ? (
                <View style={styles.goalPill}>
                  <Text variant="caption" weight="semibold" color="secondary">
                    {activeGoalLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroCopy}>
              <Text variant="body" weight="bold">
                {reviewState.review.title}
              </Text>
              <Text variant="bodySmall" color="secondary">
                {reviewState.review.summary}
              </Text>
            </View>

            {metrics.length > 0 ? (
              <View style={styles.metricList}>
                {metrics.map((metric) => {
                  const percentage =
                    metric.target > 0
                      ? formatPercent((metric.current / metric.target) * 100)
                      : null;
                  let metricText = `${metric.label}: ${metric.current} ${metric.unit}`;

                  if (metric.target > 0) {
                    metricText = `${metric.label}: ${metric.current} / ${metric.target} ${metric.unit} - ${
                      percentage ?? '0%'
                    }`;
                  }

                  return (
                    <View key={metric.key} style={styles.metricRow}>
                      <View
                        style={[styles.metricDot, { backgroundColor: theme.colors.state.success }]}
                      />
                      <Text variant="bodySmall" color="secondary" style={styles.metricRowText}>
                        {metricText}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </Card>

          {reviewState.review.improvements.length > 0 ? (
            <Card variant="outlined" style={styles.sectionCard}>
              <View style={styles.reviewListHeader}>
                <Icon name="warning-outline" size={22} color={theme.colors.state.warning} />
                <Text variant="bodySmall" weight="bold" color="primary">
                  {t('menuScreen.review.sections.adjustments')}
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
  const { openSheet, closeSheet } = useAppBottomSheet();
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

    openSheet(<MealPlanReviewContent payload={payload} onRequestClose={closeSheet} />, {
      snapPoints: ['100%'],
      containerVariant: 'scroll',
      enablePanDownToClose: true,
      onDismiss: handleDismiss,
    });
  }, [closeSheet, handleDismiss, openSheet, payload, sheetState]);

  return null;
}

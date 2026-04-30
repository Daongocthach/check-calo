import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Icon,
  Loading,
  MonthSelector,
  ProgressBar,
  ScreenContainer,
  Text,
} from '@/common/components';
import { GoalTrackingCard } from '@/features/nutrition/components/GoalTrackingCard';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { NutritionReviewSheet } from '@/features/nutrition/components/NutritionReviewSheet/NutritionReviewSheet';
import { deleteOrphanedFoodEntryAssets } from '@/features/nutrition/services/foodEntryImageSync';
import { getFoodEntryImageSyncStateMap } from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  analyzeHomeNutritionWithGemini,
  type HomeNutritionReviewDraft,
} from '@/features/nutrition/services/geminiHomeNutritionReview';
import { syncGoalTracking } from '@/features/nutrition/services/goalTrackingService';
import {
  getLatestHomeAiReviewHistoryRecord,
  getHomeAiReviewHistoryRecords,
  saveHomeAiReviewHistoryRecord,
  type HomeAiReviewHistoryRecord,
} from '@/features/nutrition/services/homeAiReviewHistoryStorage';
import {
  deleteFoodEntry,
  getDailyNutritionSummary,
  getUserProfile,
  listFoodEntriesByDate,
  listLoggedDailyStatuses,
} from '@/features/nutrition/services/nutritionDatabase';
import { useFoodEntryRefreshStore } from '@/features/nutrition/stores/useFoodEntryRefreshStore';
import type {
  DailyNutritionSummary,
  FoodEntry,
  GoalTrackingSnapshot,
  UserProfile,
} from '@/features/nutrition/types';
import { formatDateKey } from '@/features/nutrition/utils/calorie';
import { useBottomPadding, useCurrentDate, useScreenDimensions } from '@/hooks';
import { useAppAlert } from '@/providers/app-alert';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { vs } from '@/theme/metrics';
import { toast } from '@/utils/toast';

interface MealSection {
  title: string;
  data: FoodEntryWithSyncDebug[];
}

type FoodEntryWithSyncDebug = FoodEntry & {
  devSyncBadgeLabel?: string | null;
};

type HomeAiReviewState =
  | {
      status: 'idle' | 'loading';
    }
  | {
      status: 'ready';
      review: HomeNutritionReviewDraft;
      assistantMessage: string | null;
    }
  | {
      status: 'need_more_info' | 'unsupported' | 'error';
      message: string;
    };

function toDevSyncBadgeLabel(
  imageUri: string | null | undefined,
  syncState?: { status: 'pending' | 'processing' | 'done' | 'failed'; errorMessage: string | null }
) {
  if (!__DEV__) {
    return null;
  }

  if (syncState?.status === 'failed') {
    const reason = syncState.errorMessage?.trim();
    return reason ? `_DEV_ FAILED: ${reason}` : '_DEV_ FAILED';
  }

  if (syncState?.status === 'processing') {
    return '_DEV_ SYNCING';
  }

  if (syncState?.status === 'pending') {
    return '_DEV_ QUEUED';
  }

  if (typeof imageUri === 'string' && imageUri.startsWith('http')) {
    return '_DEV_ SYNCED';
  }

  if (typeof imageUri === 'string' && imageUri.startsWith('file://')) {
    return '_DEV_ LOCAL';
  }

  return null;
}

function formatTimeLabel(consumedAt: string) {
  const date = new Date(consumedAt);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function isSameCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameCalendarMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function createEmptySummary(date: Date): DailyNutritionSummary {
  return {
    date: date.toISOString().slice(0, 10),
    calorieTarget: 0,
    consumedCalories: 0,
    remainingCalories: 0,
    progressPercent: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatReviewDateLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatReviewTimeLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month <= 0 ||
    month > 12 ||
    day <= 0 ||
    day > 31
  ) {
    return new Date(dateKey);
  }

  return new Date(year, month - 1, day);
}

function groupHomeAiReviewHistory(records: HomeAiReviewHistoryRecord[]) {
  const grouped = new Map<string, HomeAiReviewHistoryRecord[]>();

  for (const record of records) {
    const list = grouped.get(record.reviewDateKey);
    if (list) {
      list.push(record);
      continue;
    }

    grouped.set(record.reviewDateKey, [record]);
  }

  return Array.from(grouped, ([dateKey, items]) => ({ dateKey, items }));
}

function getHomeAiReviewRecordTitle(record: HomeAiReviewHistoryRecord, t: TFunction): string {
  if (record.status === 'ready') {
    return record.review?.title ?? t('homeScreen.aiReview.errorTitle');
  }

  return getHomeAiReviewStatusTitle(t, record.status === 'error' ? 'error' : record.status);
}

function getHomeAiReviewRecordSummary(record: HomeAiReviewHistoryRecord, t: TFunction): string {
  if (record.status === 'ready') {
    return record.review?.summary ?? t('homeScreen.aiReview.generateFailed');
  }

  return (
    record.assistantMessage ??
    (record.status === 'error'
      ? t('homeScreen.aiReview.generateFailed')
      : t('homeScreen.aiReview.noEnoughDataFallback'))
  );
}

function getGoalTrackingCalorieLabel(t: TFunction, mode: 'lose' | 'gain' | 'maintain') {
  switch (mode) {
    case 'lose':
      return t('goalTracking.calorieDeficitLabel');
    case 'gain':
      return t('goalTracking.calorieSurplusLabel');
    case 'maintain':
    default:
      return t('goalTracking.calorieDifferenceLabel');
  }
}

function getHomeAiReviewStatusTitle(
  t: TFunction,
  status: 'error' | 'need_more_info' | 'unsupported'
) {
  switch (status) {
    case 'error':
      return t('homeScreen.aiReview.errorTitle');
    case 'need_more_info':
      return t('homeScreen.aiReview.needMoreInfoTitle');
    case 'unsupported':
      return t('homeScreen.aiReview.unsupportedTitle');
  }
}

function getHomeAiReviewAccentColors(
  theme: ReturnType<typeof useUnistyles>['theme'],
  status: HomeAiReviewState['status']
) {
  if (status === 'ready') {
    return {
      iconColor: theme.colors.state.success,
      accentColor: theme.colors.state.success,
      accentBg: theme.colors.state.successBg,
      softBg: theme.colors.state.successBg,
    };
  }

  if (status === 'need_more_info') {
    return {
      iconColor: theme.colors.state.warning,
      accentColor: theme.colors.state.warning,
      accentBg: theme.colors.state.warningBg,
      softBg: theme.colors.state.warningBg,
    };
  }

  if (status === 'unsupported') {
    return {
      iconColor: theme.colors.state.info,
      accentColor: theme.colors.state.info,
      accentBg: theme.colors.state.infoBg,
      softBg: theme.colors.state.infoBg,
    };
  }

  return {
    iconColor: theme.colors.state.success,
    accentColor: theme.colors.state.success,
    accentBg: theme.colors.state.successBg,
    softBg: theme.colors.state.successBg,
  };
}

function getMacroProgress(value: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / target) * 100));
}

function describeSemicirclePath(radius: number, centerX: number, centerY: number) {
  const startX = centerX - radius;
  const endX = centerX + radius;
  return `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`;
}

interface CaloriesRingProps {
  remainingCalories: number;
  consumedCalories: number;
  targetCalories: number;
  progressPercent: number;
  locale: string;
  t: ReturnType<typeof useTranslation>['t'];
}

function CaloriesRing({
  remainingCalories,
  consumedCalories,
  targetCalories,
  progressPercent,
  locale,
  t,
}: CaloriesRingProps) {
  const { theme } = useUnistyles();
  const { width: screenWidth, isTablet } = useScreenDimensions();
  const translate = t as unknown as (
    key: string,
    options?: Record<string, string | number>
  ) => string;
  const width = isTablet ? 360 : Math.max(240, screenWidth - theme.metrics.spacing.p32);
  const scale = width / 260;
  const height = Math.round(140 * scale);
  const strokeWidth = Math.round(14 * scale);
  const radius = Math.round(100 * scale);
  const centerX = width / 2;
  const centerY = Math.round(112 * scale);
  const trackPath = describeSemicirclePath(radius, centerX, centerY);
  const safeProgress = Math.min(100, Math.max(0, progressPercent));
  const dashLength = Math.PI * radius;
  const dashOffset = dashLength * (1 - safeProgress / 100);
  const centerTop = Math.round(40 * scale);
  const endsBottom = Math.round(16 * scale);
  const endLabelOffset = Math.round(strokeWidth / 2);
  const endLabelWidth = Math.round(36 * scale);

  return (
    <View style={[styles.calorieRingWrap, { width }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={trackPath}
          stroke={theme.colors.border.subtle}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={trackPath}
          stroke={theme.colors.brand.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={dashLength}
          strokeDashoffset={dashOffset}
        />
      </Svg>

      <View style={[styles.calorieRingCenter, { top: centerTop }]}>
        <View style={styles.calorieRingPrimaryCopy}>
          <Text variant="h2" weight="semibold" align="center" style={styles.calorieRingValue}>
            {formatNumber(Math.max(remainingCalories, 0), locale)}
          </Text>
          <Text variant="bodySmall" color="secondary" align="center">
            {translate('homeScreen.caloriesRemainingUnitLabel')}
          </Text>
        </View>
        <View style={styles.calorieRingSecondaryCopy}>
          <Text variant="bodySmall" color="secondary" align="center">
            {translate('homeScreen.caloriesConsumed', {
              consumed: formatNumber(consumedCalories, locale),
              target: formatNumber(targetCalories, locale),
            })}
          </Text>
        </View>
        <Text variant="bodySmall" weight="semibold" color="secondary" align="center">
          {translate('homeScreen.goalPercent', {
            percent: formatNumber(safeProgress, locale),
          })}
        </Text>
      </View>

      <View style={[styles.calorieRingEnds, { bottom: endsBottom }]}>
        <View style={[styles.calorieRingEndAnchor, { left: endLabelOffset, width: endLabelWidth }]}>
          <Text variant="caption" color="secondary" align="center">
            0
          </Text>
        </View>
        <View
          style={[styles.calorieRingEndAnchor, { right: endLabelOffset, width: endLabelWidth }]}
        >
          <Text variant="caption" color="secondary" align="center">
            {formatNumber(targetCalories, locale)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function HomeTab() {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const appAlert = useAppAlert();
  const { openSheet, closeSheet } = useAppBottomSheet();
  const bottomPadding = useBottomPadding();
  const currentDate = useCurrentDate();
  const previousCurrentDateRef = useRef(currentDate);
  const [selectedDate, setSelectedDate] = useState(() => currentDate);
  const [visibleMonth, setVisibleMonth] = useState(() => currentDate);
  const [monthStatuses, setMonthStatuses] = useState<Partial<Record<string, 'success' | 'failed'>>>(
    {}
  );
  const [summary, setSummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(currentDate)
  );
  const [entries, setEntries] = useState<FoodEntryWithSyncDebug[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalTracking, setGoalTracking] = useState<GoalTrackingSnapshot | null>(null);
  const [homeAiReviewState, setHomeAiReviewState] = useState<HomeAiReviewState>({
    status: 'idle',
  });
  const [homeAiReviewDateKey, setHomeAiReviewDateKey] = useState<string | null>(null);
  const [homeAiReviewSheetMode, setHomeAiReviewSheetMode] = useState<'review' | 'history'>(
    'review'
  );
  const [homeAiReviewHistoryRecords, setHomeAiReviewHistoryRecords] = useState<
    HomeAiReviewHistoryRecord[]
  >([]);
  const [isHomeAiReviewSheetOpen, setIsHomeAiReviewSheetOpen] = useState(false);
  const foodEntryRefreshRevision = useFoodEntryRefreshStore((state) => state.refreshRevision);
  const lastFoodEntryRefreshRevisionRef = useRef(foodEntryRefreshRevision);

  useEffect(() => {
    const previousCurrentDate = previousCurrentDateRef.current;

    setSelectedDate((value) =>
      isSameCalendarDate(value, previousCurrentDate) ? currentDate : value
    );
    setVisibleMonth((value) =>
      isSameCalendarMonth(value, previousCurrentDate) ? currentDate : value
    );
    previousCurrentDateRef.current = currentDate;
  }, [currentDate]);

  const loadNutritionData = useCallback(async (date: Date) => {
    const [nextProfile, nextSummary, nextEntries, nextGoalTracking] = await Promise.all([
      getUserProfile(),
      getDailyNutritionSummary(date),
      listFoodEntriesByDate(date),
      syncGoalTracking(),
    ]);
    const syncStateMap = await getFoodEntryImageSyncStateMap(nextEntries.map((entry) => entry.id));
    const entriesWithSyncDebug = nextEntries.map((entry) => ({
      ...entry,
      devSyncBadgeLabel: toDevSyncBadgeLabel(entry.imageUri, syncStateMap[entry.id]),
    }));

    setHasProfile(nextProfile !== null);
    setProfile(nextProfile);
    setSummary(nextSummary);
    setEntries(entriesWithSyncDebug);
    setGoalTracking(nextGoalTracking);
  }, []);

  const loadMonthStatuses = useCallback(async (month: Date) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const statuses = await listLoggedDailyStatuses(monthStart, monthEnd);

    setMonthStatuses(
      statuses.reduce<Partial<Record<string, 'success' | 'failed'>>>((accumulator, item) => {
        accumulator[item.date] = item.status;
        return accumulator;
      }, {})
    );
  }, []);

  const closeHomeAiReviewSheet = useCallback(() => {
    closeSheet();
    setIsHomeAiReviewSheetOpen(false);
    setHomeAiReviewSheetMode('review');
  }, [closeSheet]);

  const applyHomeAiReviewRecord = useCallback(
    (record: HomeAiReviewHistoryRecord) => {
      setHomeAiReviewDateKey(record.reviewDateKey);

      if (record.status === 'ready' && record.review) {
        setHomeAiReviewState({
          status: 'ready',
          review: record.review,
          assistantMessage: record.assistantMessage,
        });
        return;
      }

      if (record.status === 'error') {
        setHomeAiReviewState({
          status: 'error',
          message: record.assistantMessage ?? t('homeScreen.aiReview.generateFailed'),
        });
        return;
      }

      if (record.status === 'unsupported' || record.status === 'need_more_info') {
        setHomeAiReviewState({
          status: record.status,
          message: record.assistantMessage ?? t('homeScreen.aiReview.noEnoughDataFallback'),
        });
      }
    },
    [t]
  );

  const refreshHomeAiReviewHistory = useCallback(() => {
    setHomeAiReviewHistoryRecords(getHomeAiReviewHistoryRecords());
  }, []);

  const handleOpenHomeAiReviewHistory = useCallback(() => {
    refreshHomeAiReviewHistory();
    setHomeAiReviewSheetMode('history');
    setIsHomeAiReviewSheetOpen(true);
  }, [refreshHomeAiReviewHistory]);

  const openHomeAiReviewRecord = useCallback(
    (record: HomeAiReviewHistoryRecord) => {
      applyHomeAiReviewRecord(record);
      setHomeAiReviewSheetMode('review');
      setIsHomeAiReviewSheetOpen(true);
    },
    [applyHomeAiReviewRecord]
  );

  const homeAiReviewHistorySections = useMemo(
    () => groupHomeAiReviewHistory(homeAiReviewHistoryRecords),
    [homeAiReviewHistoryRecords]
  );

  const buildHomeAiReviewContext = useCallback(() => {
    const selectedDateLabel = formatReviewDateLabel(selectedDate, i18n.language);
    const selectedDateIso = selectedDate.toISOString();
    const reviewEntries = entries.slice(0, 12).map((entry) => ({
      timeLabel: formatTimeLabel(entry.consumedAt),
      mealName: entry.mealName,
      calories: Math.round(entry.totalCalories),
      proteinGrams: Math.round(entry.proteinGrams),
      carbsGrams: Math.round(entry.carbsGrams),
      fatGrams: Math.round(entry.fatGrams),
      quantityLabel: entry.quantityLabel,
    }));

    return {
      selectedDateLabel,
      selectedDateIso,
      summary: {
        consumedCalories: summary.consumedCalories,
        calorieTarget: summary.calorieTarget,
        remainingCalories: summary.remainingCalories,
        progressPercent: summary.progressPercent,
        proteinGrams: summary.proteinGrams,
        carbsGrams: summary.carbsGrams,
        fatGrams: summary.fatGrams,
      },
      goalTracking: goalTracking?.activeGoal
        ? {
            activeGoalTitle: t('goalTracking.activeTitle'),
            progressPercent: goalTracking.activeGoal.progressPercent,
            currentStreak: goalTracking.currentStreak,
            calorieDifferenceLabel: getGoalTrackingCalorieLabel(
              t,
              goalTracking.activeGoal.goal.mode
            ),
          }
        : null,
      entries: reviewEntries,
      locale: i18n.language,
    };
  }, [entries, goalTracking, i18n.language, selectedDate, summary, t]);

  const generateHomeAiReview = useCallback(async () => {
    try {
      const result = await analyzeHomeNutritionWithGemini(buildHomeAiReviewContext());
      const savedRecord = saveHomeAiReviewHistoryRecord({
        reviewDate: selectedDate,
        status: result.status,
        review: result.status === 'ready' ? result.review : null,
        assistantMessage: result.assistantMessage,
      });

      if (result.status === 'ready') {
        applyHomeAiReviewRecord(savedRecord);
        refreshHomeAiReviewHistory();
        return;
      }

      applyHomeAiReviewRecord(savedRecord);
      refreshHomeAiReviewHistory();
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : t('homeScreen.aiReview.generateFailed');
      let message = rawMessage;
      if (rawMessage.includes('Daily AI usage limit reached')) {
        message = t('common.aiQuotaExceeded');
      } else if (
        rawMessage.includes('Authentication required') ||
        rawMessage.includes('Unauthorized')
      ) {
        message = t('common.signInRequired');
      }
      const savedRecord = saveHomeAiReviewHistoryRecord({
        reviewDate: selectedDate,
        status: 'error',
        review: null,
        assistantMessage: message,
      });
      applyHomeAiReviewRecord(savedRecord);
      refreshHomeAiReviewHistory();
    }
  }, [
    applyHomeAiReviewRecord,
    buildHomeAiReviewContext,
    refreshHomeAiReviewHistory,
    selectedDate,
    t,
  ]);

  const handleOpenHomeAiReview = useCallback(() => {
    if (!isSameCalendarDate(selectedDate, currentDate)) {
      toast.info(t('homeScreen.aiReview.todayOnly'));
      return;
    }

    const latestRecord = getLatestHomeAiReviewHistoryRecord(selectedDate);
    if (latestRecord) {
      applyHomeAiReviewRecord(latestRecord);
      refreshHomeAiReviewHistory();
      setHomeAiReviewSheetMode('review');
      setIsHomeAiReviewSheetOpen(true);
      return;
    }

    setHomeAiReviewDateKey(formatDateKey(selectedDate));
    setHomeAiReviewSheetMode('review');
    setIsHomeAiReviewSheetOpen(true);
    setHomeAiReviewState({ status: 'loading' });
  }, [applyHomeAiReviewRecord, currentDate, refreshHomeAiReviewHistory, selectedDate, t]);

  useEffect(() => {
    if (!isHomeAiReviewSheetOpen) {
      return;
    }

    const isHistoryMode = homeAiReviewSheetMode === 'history';
    const displayDateKey = homeAiReviewDateKey ?? formatDateKey(selectedDate);
    const displayDate = parseLocalDateKey(displayDateKey);
    const isTodayReview = displayDateKey === formatDateKey(currentDate);
    const reviewColors = getHomeAiReviewAccentColors(theme, homeAiReviewState.status);
    let reviewMoodTitle = t('homeScreen.aiReview.loading');
    if (homeAiReviewState.status === 'ready') {
      reviewMoodTitle = homeAiReviewState.review.title;
    } else if (homeAiReviewState.status === 'need_more_info') {
      reviewMoodTitle = t('homeScreen.aiReview.needMoreInfoTitle');
    } else if (homeAiReviewState.status === 'unsupported') {
      reviewMoodTitle = t('homeScreen.aiReview.unsupportedTitle');
    }

    let aiReviewBody: ReactNode;
    if (isHistoryMode) {
      if (homeAiReviewHistorySections.length > 0) {
        aiReviewBody = (
          <View style={styles.aiReviewHistoryList}>
            {homeAiReviewHistorySections.map((section) => {
              const sectionDate = parseLocalDateKey(section.dateKey);

              return (
                <View key={section.dateKey} style={styles.aiReviewHistorySection}>
                  <Text variant="bodySmall" weight="bold">
                    {formatReviewDateLabel(sectionDate, i18n.language)}
                  </Text>
                  <View style={styles.aiReviewHistorySectionItems}>
                    {section.items.map((record) => (
                      <Card
                        key={record.id}
                        pressable
                        variant="outlined"
                        onPress={() => {
                          openHomeAiReviewRecord(record);
                        }}
                        style={styles.aiReviewHistoryItem}
                      >
                        <View style={styles.aiReviewHistoryItemTopRow}>
                          <Text variant="caption" color="secondary">
                            {formatReviewTimeLabel(new Date(record.createdAt), i18n.language)}
                          </Text>
                          <Text variant="bodySmall" weight="bold">
                            {getHomeAiReviewRecordTitle(record, t)}
                          </Text>
                        </View>
                        <Text variant="bodySmall" color="secondary">
                          {getHomeAiReviewRecordSummary(record, t)}
                        </Text>
                      </Card>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        );
      } else {
        aiReviewBody = (
          <Card variant="elevated" style={styles.aiReviewEmptyCard}>
            <Text variant="bodySmall" weight="bold">
              {t('homeScreen.aiReview.historyEmpty')}
            </Text>
          </Card>
        );
      }
    } else {
      const homeAiReviewMessage =
        homeAiReviewState.status === 'error' ||
        homeAiReviewState.status === 'need_more_info' ||
        homeAiReviewState.status === 'unsupported'
          ? homeAiReviewState.message
          : '';
      let homeAiReviewEmptyTitle = t('homeScreen.aiReview.errorTitle');
      if (
        homeAiReviewState.status === 'error' ||
        homeAiReviewState.status === 'need_more_info' ||
        homeAiReviewState.status === 'unsupported'
      ) {
        homeAiReviewEmptyTitle = getHomeAiReviewStatusTitle(t, homeAiReviewState.status);
      }

      if (homeAiReviewState.status === 'loading') {
        aiReviewBody = (
          <View style={styles.aiReviewLoadingState}>
            <Card variant="outlined" style={styles.aiReviewIntroCard}>
              <View style={[styles.aiReviewIntroIcon, { backgroundColor: reviewColors.softBg }]}>
                <Icon name="document-text-outline" size={20} color={reviewColors.iconColor} />
              </View>
              <View style={styles.aiReviewIntroCopy}>
                <Text variant="body" weight="semibold">
                  {t('homeScreen.aiReview.loading')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t('homeScreen.aiReview.subtitle')}
                </Text>
              </View>
              <View style={styles.aiReviewIntroChevron}>
                <Loading size="small" />
              </View>
            </Card>
          </View>
        );
      } else if (homeAiReviewState.status === 'ready') {
        aiReviewBody = (
          <View style={styles.aiReviewResult}>
            <Card variant="outlined" style={styles.aiReviewSummaryCard}>
              <View style={styles.aiReviewSummaryCopy}>
                <Text variant="body" weight="bold">
                  {reviewMoodTitle}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {homeAiReviewState.review.summary}
                </Text>
              </View>
            </Card>

            {homeAiReviewState.review.strengths.length > 0 ? (
              <Card variant="outlined" style={styles.aiReviewListBlock}>
                <View style={styles.aiReviewListHeader}>
                  <Icon
                    name="checkmark-circle-outline"
                    size={22}
                    color={theme.colors.state.success}
                  />
                  <Text variant="bodySmall" weight="bold" color="primary">
                    {t('homeScreen.aiReview.strengths')}
                  </Text>
                </View>
                <View style={styles.aiReviewBulletList}>
                  {homeAiReviewState.review.strengths.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.aiReviewBulletRow}>
                      <View style={[styles.aiReviewBulletDot, styles.aiReviewBulletDotSuccess]} />
                      <Text variant="bodySmall" color="secondary" style={styles.aiReviewBulletText}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {homeAiReviewState.review.improvements.length > 0 ? (
              <Card variant="outlined" style={styles.aiReviewListBlock}>
                <View style={styles.aiReviewListHeader}>
                  <Icon name="warning-outline" size={22} color={theme.colors.state.warning} />
                  <Text variant="bodySmall" weight="bold" color="primary">
                    {t('homeScreen.aiReview.improvements')}
                  </Text>
                </View>
                <View style={styles.aiReviewBulletList}>
                  {homeAiReviewState.review.improvements.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.aiReviewBulletRow}>
                      <View style={[styles.aiReviewBulletDot, styles.aiReviewBulletDotWarning]} />
                      <Text variant="bodySmall" color="secondary" style={styles.aiReviewBulletText}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {homeAiReviewState.review.nextAction ? (
              <Card
                variant="outlined"
                style={[styles.aiReviewActionCard, styles.aiReviewNextActionCard]}
              >
                <View style={styles.aiReviewListHeader}>
                  <Icon name="bulb-outline" size={22} color={theme.colors.state.warning} />
                  <Text variant="bodySmall" weight="bold" color="primary">
                    {t('homeScreen.aiReview.nextAction')}
                  </Text>
                </View>
                <Text variant="bodySmall" color="secondary">
                  {homeAiReviewState.review.nextAction}
                </Text>
              </Card>
            ) : null}

            {homeAiReviewState.assistantMessage ? (
              <Text variant="caption" color="secondary">
                {homeAiReviewState.assistantMessage}
              </Text>
            ) : null}
          </View>
        );
      } else {
        aiReviewBody = (
          <Card variant="elevated" style={styles.aiReviewEmptyCard}>
            <Text variant="bodySmall" weight="bold">
              {homeAiReviewEmptyTitle}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {homeAiReviewMessage}
            </Text>
          </Card>
        );
      }
    }

    openSheet(
      <NutritionReviewSheet
        title={
          isHistoryMode ? t('homeScreen.aiReview.historyTitle') : t('homeScreen.aiReview.title')
        }
        subtitle={
          isHistoryMode
            ? t('homeScreen.aiReview.historySubtitle')
            : t('homeScreen.aiReview.subtitle')
        }
        iconColor={reviewColors.iconColor}
        headerActions={
          !isHistoryMode ? (
            <Button
              title={t('homeScreen.aiReview.history')}
              variant="ghost"
              size="sm"
              rightIcon={
                <Icon name="chevron-forward-outline" size={16} color={theme.colors.brand.primary} />
              }
              onPress={handleOpenHomeAiReviewHistory}
            />
          ) : null
        }
        headerMeta={
          isHistoryMode ? (
            <View style={styles.aiReviewHistoryHeaderRow}>
              <View style={styles.aiReviewDatePill}>
                <Text variant="caption" weight="semibold" color="secondary">
                  {formatReviewDateLabel(displayDate, i18n.language)}
                </Text>
              </View>
              <Button
                title={t('homeScreen.aiReview.backToReview')}
                variant="ghost"
                size="sm"
                leftIcon={
                  <Icon name="chevron-back-outline" size={16} color={theme.colors.text.primary} />
                }
                onPress={() => {
                  setHomeAiReviewSheetMode('review');
                }}
              />
            </View>
          ) : null
        }
        badge={
          isHistoryMode ? null : (
            <View style={styles.aiReviewDatePill}>
              <Text variant="caption" weight="semibold" color="secondary">
                {formatReviewDateLabel(displayDate, i18n.language)}
              </Text>
            </View>
          )
        }
        footerActions={
          <>
            {!isHistoryMode && homeAiReviewState.status !== 'loading' && isTodayReview ? (
              <Button
                title={t('homeScreen.aiReview.retry')}
                variant="outline"
                size="sm"
                leftIcon={
                  <Icon name="sparkles-outline" size={16} color={theme.colors.text.primary} />
                }
                onPress={() => {
                  setHomeAiReviewState({ status: 'loading' });
                }}
              />
            ) : null}
            <Button
              title={t('common.close')}
              variant="ghost"
              size="sm"
              onPress={closeHomeAiReviewSheet}
            />
          </>
        }
      >
        {aiReviewBody}
      </NutritionReviewSheet>,
      {
        snapPoints: ['90%', '100%'],
        containerVariant: 'scroll',
        enablePanDownToClose: true,
        onDismiss: closeHomeAiReviewSheet,
      }
    );
  }, [
    closeHomeAiReviewSheet,
    currentDate,
    handleOpenHomeAiReviewHistory,
    homeAiReviewDateKey,
    homeAiReviewHistorySections,
    homeAiReviewSheetMode,
    homeAiReviewState,
    i18n.language,
    isHomeAiReviewSheetOpen,
    openSheet,
    openHomeAiReviewRecord,
    selectedDate,
    summary.calorieTarget,
    summary.consumedCalories,
    summary.progressPercent,
    t,
    theme.colors.text.primary,
    theme,
  ]);

  useEffect(() => {
    if (!isHomeAiReviewSheetOpen || homeAiReviewState.status !== 'loading') {
      return;
    }

    void generateHomeAiReview();
  }, [generateHomeAiReview, homeAiReviewState.status, isHomeAiReviewSheetOpen]);

  const handleDeleteEntry = useCallback(
    (meal: FoodEntryWithSyncDebug) => {
      appAlert.alert(
        t('homeScreen.meals.deleteTitle'),
        t('homeScreen.meals.deleteMessage', { name: meal.mealName }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              void deleteFoodEntry(meal.id)
                .then(async () => {
                  await deleteOrphanedFoodEntryAssets(meal.imageUri, meal.thumbnailUri);
                  await Promise.all([
                    loadNutritionData(selectedDate),
                    loadMonthStatuses(visibleMonth),
                  ]);
                })
                .catch(() => {
                  toast.error(t('profileScreen.actionError'));
                });
            },
          },
        ]
      );
    },
    [appAlert, loadMonthStatuses, loadNutritionData, selectedDate, t, visibleMonth]
  );

  useFocusEffect(
    useCallback(() => {
      void loadNutritionData(selectedDate);
      void loadMonthStatuses(visibleMonth);
    }, [loadMonthStatuses, loadNutritionData, selectedDate, visibleMonth])
  );

  useEffect(() => {
    if (lastFoodEntryRefreshRevisionRef.current === foodEntryRefreshRevision) {
      return;
    }

    lastFoodEntryRefreshRevisionRef.current = foodEntryRefreshRevision;
    void loadNutritionData(selectedDate);
    void loadMonthStatuses(visibleMonth);
  }, [foodEntryRefreshRevision, loadMonthStatuses, loadNutritionData, selectedDate, visibleMonth]);

  const mealSections = useMemo<MealSection[]>(() => {
    return entries.reduce<MealSection[]>((accumulator, entry) => {
      const title = formatTimeLabel(entry.consumedAt);
      const existingSection = accumulator.find((section) => section.title === title);

      if (existingSection) {
        existingSection.data.push(entry);
        return accumulator;
      }

      accumulator.push({
        title,
        data: [entry],
      });

      return accumulator;
    }, []);
  }, [entries]);

  const caloriesLeft = Math.max(summary.remainingCalories, 0);
  const macroRows = useMemo(
    () => [
      {
        label: t('statsScreen.macros.protein'),
        current: summary.proteinGrams,
        target: profile?.proteinTargetGrams ?? 0,
        color: theme.colors.state.info,
        trackColor: theme.colors.state.infoBg,
        icon: 'fish' as const,
      },
      {
        label: t('statsScreen.macros.carbs'),
        current: summary.carbsGrams,
        target: profile?.carbsTargetGrams ?? 0,
        color: theme.colors.state.warning,
        trackColor: theme.colors.state.warningBg,
        icon: 'nutrition' as const,
      },
      {
        label: t('statsScreen.macros.fat'),
        current: summary.fatGrams,
        target: profile?.fatTargetGrams ?? 0,
        color: theme.colors.state.success,
        trackColor: theme.colors.state.successBg,
        icon: 'water' as const,
      },
    ],
    [
      profile?.carbsTargetGrams,
      profile?.fatTargetGrams,
      profile?.proteinTargetGrams,
      summary.carbsGrams,
      summary.fatGrams,
      summary.proteinGrams,
      t,
      theme.colors.state.info,
      theme.colors.state.infoBg,
      theme.colors.state.success,
      theme.colors.state.successBg,
      theme.colors.state.warning,
      theme.colors.state.warningBg,
    ]
  );
  const isTodaySelected = isSameCalendarDate(selectedDate, currentDate);

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <SectionList
        sections={mealSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + theme.metrics.spacingV.p32 },
        ]}
        renderSectionHeader={({ section }) => (
          <View style={styles.mealSection}>
            <Text variant="caption" weight="semibold" color="secondary">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item: meal }) => (
          <View style={styles.mealItemWrap}>
            <HomeMealCard.Root
              item={toHomeMealCardItem(meal)}
              onPress={() =>
                router.push({
                  pathname: '/food-detail',
                  params: {
                    entryId: meal.id,
                  },
                })
              }
            >
              <HomeMealCard.Preview />
              <HomeMealCard.Content>
                <HomeMealCard.Header>
                  <HomeMealCard.ActionButton
                    icon="trash-outline"
                    label={t('common.delete')}
                    tone="danger"
                    onPress={() => {
                      handleDeleteEntry(meal);
                    }}
                  />
                </HomeMealCard.Header>
                <HomeMealCard.Macros
                  proteinTargetGrams={profile?.proteinTargetGrams}
                  carbsTargetGrams={profile?.carbsTargetGrams}
                  fatTargetGrams={profile?.fatTargetGrams}
                />
              </HomeMealCard.Content>
            </HomeMealCard.Root>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card variant="elevated" style={styles.monthSelectorCard}>
              <MonthSelector
                selectedDate={selectedDate}
                onChange={setSelectedDate}
                maxDate={currentDate}
                locale={i18n.language}
                dayStatuses={monthStatuses}
                onMonthChange={setVisibleMonth}
              />
            </Card>

            {hasProfile ? (
              <Card variant="elevated" style={styles.calorieCard}>
                <CaloriesRing
                  remainingCalories={caloriesLeft}
                  consumedCalories={summary.consumedCalories}
                  targetCalories={summary.calorieTarget}
                  progressPercent={summary.progressPercent}
                  locale={i18n.language}
                  t={t}
                />
              </Card>
            ) : (
              <Card variant="elevated" style={styles.calorieCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderCopy}>
                    <Text variant="body" weight="bold">
                      {t('homeScreen.profilePrompt.title')}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {t('homeScreen.profilePrompt.subtitle')}
                    </Text>
                  </View>
                </View>
                <Button
                  title={t('homeScreen.profilePrompt.action')}
                  onPress={() => router.push('/welcome')}
                />
              </Card>
            )}

            <Card variant="elevated" style={styles.macroCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderCopy}>
                  <Text variant="body" weight="bold">
                    {t('homeScreen.macroToday')}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('statsScreen.macros.title')}
                  </Text>
                </View>
                <Button
                  title={t('homeScreen.details')}
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    <Icon
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.brand.primary}
                      variant="primary"
                    />
                  }
                  onPress={() => router.push('/stats')}
                />
              </View>

              <View style={styles.macroList}>
                {macroRows.map((row) => {
                  const progress = getMacroProgress(row.current, row.target);
                  let progressScheme: 'info' | 'warning' | 'success' = 'success';

                  if (row.icon === 'fish') {
                    progressScheme = 'info';
                  } else if (row.icon === 'nutrition') {
                    progressScheme = 'warning';
                  }

                  return (
                    <View key={row.label} style={styles.macroRow}>
                      <View style={styles.macroRowTop}>
                        <View style={styles.macroLabelRow}>
                          <View style={[styles.macroIconWrap, { backgroundColor: row.trackColor }]}>
                            <Icon name={row.icon} size={16} color={row.color} />
                          </View>
                          <View style={styles.macroLabelCopy}>
                            <Text variant="bodySmall" weight="medium">
                              {row.label}
                            </Text>
                            <Text variant="caption" color="secondary">
                              {`${formatNumber(Math.round(row.current), i18n.language)} / ${formatNumber(Math.round(row.target), i18n.language)}g`}
                            </Text>
                          </View>
                        </View>
                        <Text variant="bodySmall" weight="semibold">
                          {`${progress}%`}
                        </Text>
                      </View>
                      <ProgressBar
                        value={progress}
                        size="md"
                        colorScheme={progressScheme}
                        accessibilityLabel={row.label}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>

            <GoalTrackingCard goalTracking={goalTracking} todaySummary={summary} />

            <View style={styles.mealsHeaderRow}>
              <View style={styles.cardHeaderCopy}>
                <Text variant="body" weight="bold">
                  {t('homeScreen.meals.title')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t('homeScreen.meals.subtitle')}
                </Text>
              </View>
              <Button
                title={t('homeScreen.meals.review')}
                variant="outline"
                size="sm"
                leftIcon={
                  <Icon
                    name="sparkles-outline"
                    size={16}
                    color={theme.colors.text.primary}
                    variant="primary"
                  />
                }
                disabled={!isTodaySelected}
                onPress={handleOpenHomeAiReview}
              />
            </View>

            {entries.length === 0 ? (
              <Card variant="elevated" style={styles.emptyCard}>
                <Text variant="body" weight="bold">
                  {t('homeScreen.meals.emptyTitle')}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t('homeScreen.meals.emptySubtitle')}
                </Text>
              </Card>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    gap: theme.metrics.spacingV.p20,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  monthSelectorCard: {
    gap: 0,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    gap: theme.metrics.spacingV.p4,
  },
  calorieCard: {
    gap: theme.metrics.spacingV.p8,
  },
  calorieRingWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.metrics.spacingV.p4,
    paddingBottom: theme.metrics.spacingV.p4,
    alignSelf: 'center',
  },
  calorieRingCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: theme.metrics.spacing.p36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  calorieRingPrimaryCopy: {
    alignItems: 'center',
  },
  calorieRingSecondaryCopy: {
    alignItems: 'center',
    marginTop: theme.metrics.spacingV.p8,
  },
  calorieRingEnds: {
    position: 'absolute',
    left: theme.metrics.spacing.p8,
    right: theme.metrics.spacing.p8,
    bottom: theme.metrics.spacingV.p4,
  },
  calorieRingEndAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  calorieRingValue: {
    lineHeight: 44,
  },
  macroCard: {
    gap: theme.metrics.spacingV.p16,
  },
  macroList: {
    gap: theme.metrics.spacingV.p16,
  },
  macroRow: {
    gap: theme.metrics.spacingV.p8,
  },
  macroRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  macroLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  macroIconWrap: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabelCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  mealsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  aiReviewSheetContent: {
    gap: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p12,
  },
  aiReviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
  },
  aiReviewHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  aiReviewIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    padding: theme.metrics.spacing.p16,
    backgroundColor: theme.colors.background.surface,
  },
  aiReviewIntroIcon: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiReviewIntroCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  aiReviewIntroChevron: {
    width: theme.metrics.spacing.p28,
    alignItems: 'flex-end',
  },
  aiReviewDatePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  aiReviewHistoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  aiReviewLoadingState: {
    gap: theme.metrics.spacingV.p12,
  },
  aiReviewResult: {
    gap: theme.metrics.spacingV.p12,
  },
  aiReviewHistoryList: {
    gap: theme.metrics.spacingV.p16,
  },
  aiReviewHistorySection: {
    gap: theme.metrics.spacingV.p8,
  },
  aiReviewHistorySectionItems: {
    gap: theme.metrics.spacingV.p8,
  },
  aiReviewHistoryItem: {
    gap: theme.metrics.spacingV.p8,
  },
  aiReviewHistoryItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  aiReviewListBlock: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  aiReviewBulletList: {
    gap: theme.metrics.spacingV.p8,
  },
  aiReviewBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p8,
  },
  aiReviewBulletDot: {
    width: theme.metrics.spacing.p4,
    height: theme.metrics.spacing.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
    marginTop: theme.metrics.spacingV.p8,
  },
  aiReviewBulletDotSuccess: {
    backgroundColor: theme.colors.state.success,
  },
  aiReviewBulletDotWarning: {
    backgroundColor: theme.colors.state.warning,
  },
  aiReviewBulletText: {
    flex: 1,
  },
  aiReviewActionCard: {
    gap: theme.metrics.spacingV.p8,
  },
  aiReviewNextActionCard: {
    backgroundColor: theme.colors.state.warningBg,
    borderColor: theme.colors.state.warningBg,
  },
  aiReviewSummaryCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    padding: theme.metrics.spacing.p16,
    borderColor: theme.colors.border.default,
  },
  aiReviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  aiReviewSummaryIcon: {
    width: theme.metrics.spacing.p48,
    height: theme.metrics.spacing.p48,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiReviewSummaryCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  aiReviewListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  aiReviewEmptyCard: {
    gap: theme.metrics.spacingV.p4,
  },
  aiReviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.metrics.spacing.p12,
    flexWrap: 'wrap',
  },
  heroCard: {
    borderRadius: theme.metrics.borderRadius.xl,
    padding: theme.metrics.spacing.p20,
    gap: vs(18),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  dayPill: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
  },
  heroStat: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  heroStatEnd: {
    alignItems: 'flex-end',
  },
  remainingOverText: {
    color: theme.colors.state.error,
  },
  remainingPositiveText: {
    color: theme.colors.state.success,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surface,
  },
  heroHighlightIcon: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  heroHighlightCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  macroGoalSection: {
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  macroGoalTitle: {
    letterSpacing: 0.4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
  },
  profilePromptCard: {
    gap: theme.metrics.spacingV.p16,
  },
  profilePromptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
  },
  profilePromptIcon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  profilePromptCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  goalTrackingCard: {
    gap: theme.metrics.spacingV.p12,
  },
  goalTrackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  goalTrackingCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  goalProgressMetric: {
    flex: 1,
  },
  goalProgressMetricEnd: {
    alignItems: 'flex-end',
  },
  goalDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: vs(12),
  },
  goalActionRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  goalCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  goalActionButton: {
    minHeight: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  goalActionButtonLabel: {
    color: theme.colors.text.primary,
  },
  goalSelectTrigger: {
    minHeight: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  goalSelectCallToAction: {
    minHeight: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.lg,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
    backgroundColor: theme.colors.brand.primary,
  },
  mealSection: {
    gap: theme.metrics.spacingV.p4,
  },
  mealItemWrap: {
    marginTop: theme.metrics.spacingV.p4,
    marginBottom: theme.metrics.spacingV.p16,
  },
  addFoodIconCircle: {
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacing.p24,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  sectionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.metrics.spacing.p12,
  },
  itemTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p4,
    paddingLeft: theme.metrics.spacing.p4,
  },
  itemRail: {
    width: theme.metrics.spacing.p20,
    alignItems: 'center',
    paddingTop: theme.metrics.spacingV.p4,
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
}));

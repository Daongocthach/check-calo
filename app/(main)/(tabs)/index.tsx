import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Icon,
  MonthSelector,
  ProgressBar,
  ScreenContainer,
  Text,
} from '@/common/components';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { getFoodEntryImageSyncStateMap } from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  getDailyNutritionSummary,
  getUserProfile,
  listFoodEntriesByDate,
  listLoggedDailyStatuses,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import type { DailyNutritionSummary, FoodEntry, UserProfile } from '@/features/nutrition/types';
import { useBottomPadding, useCurrentDate, useScreenDimensions } from '@/hooks';
import { vs } from '@/theme/metrics';

interface MealSection {
  title: string;
  data: FoodEntryWithSyncDebug[];
}

type FoodEntryWithSyncDebug = FoodEntry & {
  devSyncBadgeLabel?: string | null;
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
          stroke={theme.colors.state.success}
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
    const [nextProfile, nextSummary, nextEntries] = await Promise.all([
      getUserProfile(),
      getDailyNutritionSummary(date),
      listFoodEntriesByDate(date),
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

  useFocusEffect(
    useCallback(() => {
      void loadNutritionData(selectedDate);
      void loadMonthStatuses(visibleMonth);
    }, [loadMonthStatuses, loadNutritionData, selectedDate, visibleMonth])
  );

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
                    icon="ellipsis-vertical"
                    label={t('common.more')}
                    onPress={() =>
                      router.push({
                        pathname: '/food-form',
                        params: {
                          entryId: meal.id,
                        },
                      })
                    }
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
                        size="sm"
                        colorScheme={progressScheme}
                        accessibilityLabel={row.label}
                      />
                    </View>
                  );
                })}
              </View>
            </Card>

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
                title={t('homeScreen.meals.addFood')}
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
                onPress={() => {
                  useAddMealSourceSheetStore.getState().requestOpen();
                }}
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

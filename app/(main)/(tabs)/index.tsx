import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import {
  Button,
  Card,
  Chip,
  Icon,
  MonthSelector,
  ProgressBar,
  ScreenContainer,
  Select,
  Text,
} from '@/common/components';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { MacroGoalCard } from '@/features/nutrition/components/MacroGoalCard';
import { MONTHLY_WEIGHT_GOAL_OPTIONS } from '@/features/nutrition/constants';
import { deleteOrphanedFoodEntryAssets } from '@/features/nutrition/services/foodEntryImageSync';
import { getFoodEntryImageSyncStateMap } from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  continueLatestCompletedGoal,
  syncActiveGoalToProfile,
  syncGoalTracking,
} from '@/features/nutrition/services/goalTrackingService';
import {
  deleteFoodEntry,
  getDailyNutritionSummary,
  getUserProfile,
  listLoggedDailyStatuses,
  listFoodEntriesByDate,
  upsertUserProfile,
} from '@/features/nutrition/services/nutritionDatabase';
import type {
  AchievementKey,
  DailyNutritionSummary,
  FoodEntry,
  GoalTrackingSnapshot,
  UserProfile,
  WeightGoalProgress,
} from '@/features/nutrition/types';
import { getDailyCalorieGoalState, getWeightGoalMode } from '@/features/nutrition/utils/calorie';
import {
  formatWeightGoalTitle,
  getGoalCycleDayProgress,
} from '@/features/nutrition/utils/goalTracking';
import { useAppAlert } from '@/providers/app-alert';
import { vs } from '@/theme/metrics';
import { toast } from '@/utils/toast';

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

function getHomeBalanceCopy(
  profile: UserProfile | null,
  summary: DailyNutritionSummary
): {
  value: number;
  labelKey:
    | 'homeScreen.onTrack'
    | 'homeScreen.goalMet'
    | 'homeScreen.belowTarget'
    | 'homeScreen.overTarget';
  color: 'link' | 'accent' | 'secondary';
} {
  const goalMode = getWeightGoalMode(profile?.monthlyWeightGoalKg ?? 0);
  const goalState = getDailyCalorieGoalState(
    profile,
    summary.calorieTarget,
    summary.consumedCalories
  );

  if (goalState === 'on_target') {
    return {
      value: 0,
      labelKey: goalMode === 'lose' ? 'homeScreen.onTrack' : 'homeScreen.goalMet',
      color: 'link',
    };
  }

  if (goalState === 'below_target') {
    return {
      value: Math.abs(summary.remainingCalories),
      labelKey: 'homeScreen.belowTarget',
      color: 'secondary',
    };
  }

  return {
    value: Math.abs(summary.remainingCalories),
    labelKey: 'homeScreen.overTarget',
    color: 'accent',
  };
}

function getMonthlyWeightGoalPlanKey(value: number) {
  switch (value) {
    case -1:
      return 'welcomeScreen.monthlyWeightPlans.gain_1' as const;
    case -0.5:
      return 'welcomeScreen.monthlyWeightPlans.gain_0_5' as const;
    case 0:
      return 'welcomeScreen.monthlyWeightPlans.0' as const;
    case 0.5:
      return 'welcomeScreen.monthlyWeightPlans.lose_0_5' as const;
    case 1:
      return 'welcomeScreen.monthlyWeightPlans.lose_1' as const;
    default:
      return 'welcomeScreen.monthlyWeightPlans.0' as const;
  }
}

function getGoalProgressCopy(
  t: ReturnType<typeof useTranslation>['t'],
  goalProgress: WeightGoalProgress
) {
  if (goalProgress.unit === 'days') {
    return {
      progressLabel: t('goalTracking.progressDays', {
        current: goalProgress.progressValue,
        target: goalProgress.targetValue,
      }),
      remainingLabel: t('goalTracking.remainingDays', { value: goalProgress.remainingValue }),
    };
  }

  return {
    progressLabel: t('goalTracking.progressKcal', {
      current: goalProgress.progressValue,
      target: goalProgress.targetValue,
    }),
    remainingLabel: t('goalTracking.remainingKcal', { value: goalProgress.remainingValue }),
  };
}

function getAchievementTitleKey(achievementKey: AchievementKey) {
  switch (achievementKey) {
    case 'fire_keeper_7':
      return 'achievements.items.fire_keeper_7.title' as const;
    case 'fire_keeper_14':
      return 'achievements.items.fire_keeper_14.title' as const;
    case 'first_maintain_goal':
      return 'achievements.items.first_maintain_goal.title' as const;
    default:
      return 'achievements.items.goal_crusher.title' as const;
  }
}

export default function HomeTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const appAlert = useAppAlert();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [summary, setSummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(new Date())
  );
  const [entries, setEntries] = useState<FoodEntryWithSyncDebug[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [monthStatuses, setMonthStatuses] = useState<Partial<Record<string, 'success' | 'failed'>>>(
    {}
  );
  const [goalTracking, setGoalTracking] = useState<GoalTrackingSnapshot | null>(null);

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

  const loadGoalTracking = useCallback(async () => {
    const snapshot = await syncGoalTracking();
    setGoalTracking(snapshot);

    if (snapshot.justCompletedGoal) {
      toast.success(t('goalTracking.toasts.goalCompleted'));
    }

    if (snapshot.newlyUnlockedAchievements.length > 0) {
      toast.success(t('goalTracking.toasts.achievementUnlockedGeneric'));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadNutritionData(selectedDate);
      void loadMonthStatuses(visibleMonth);
      void loadGoalTracking();
    }, [loadGoalTracking, loadMonthStatuses, loadNutritionData, selectedDate, visibleMonth])
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

  const balanceCopy = useMemo(() => getHomeBalanceCopy(profile, summary), [profile, summary]);
  const progressColorScheme = useMemo(() => {
    const goalState = getDailyCalorieGoalState(
      profile,
      summary.calorieTarget,
      summary.consumedCalories
    );

    if (goalState === 'on_target') {
      return 'success' as const;
    }

    return goalState === 'below_target' ? 'warning' : 'error';
  }, [profile, summary.calorieTarget, summary.consumedCalories]);

  const activeGoalProgress = goalTracking?.activeGoal ?? null;
  const latestCompletedGoal = goalTracking?.latestCompletedGoal ?? null;
  const activeGoalCopy = useMemo(
    () => (activeGoalProgress ? getGoalProgressCopy(t, activeGoalProgress) : null),
    [activeGoalProgress, t]
  );
  const activeGoalCycleCopy = useMemo(() => {
    if (!activeGoalProgress) {
      return null;
    }

    const cycleProgress = getGoalCycleDayProgress(activeGoalProgress);
    if (!cycleProgress) {
      return null;
    }

    return t('goalTracking.progressDays', {
      current: cycleProgress.current,
      target: cycleProgress.target,
    });
  }, [activeGoalProgress, t]);
  const heroHighlight = useMemo(() => {
    if (goalTracking?.currentStreak && goalTracking.currentStreak > 0) {
      return {
        icon: 'flame' as const,
        iconVariant: 'accent' as const,
        label: t('achievements.currentStreak'),
        value: t('achievements.currentStreakValue', { count: goalTracking.currentStreak }),
      };
    }

    const latestAchievement = goalTracking?.unlockedAchievements[0];
    if (latestAchievement) {
      return {
        icon: 'trophy-outline' as const,
        iconVariant: 'primary' as const,
        label: t('achievements.title'),
        value: t(getAchievementTitleKey(latestAchievement.achievementKey)),
      };
    }

    return null;
  }, [goalTracking, t]);
  const monthlyGoalOptions = useMemo(
    () =>
      [...MONTHLY_WEIGHT_GOAL_OPTIONS].sort((left, right) => {
        const orderMap = new Map<number, number>([
          [0.5, 0],
          [1, 1],
          [0, 2],
          [-0.5, 3],
          [-1, 4],
        ]);

        return (orderMap.get(left) ?? 99) - (orderMap.get(right) ?? 99);
      }),
    []
  );
  const goalSelectOptions = useMemo(
    () =>
      monthlyGoalOptions.map((option) => ({
        label: t(getMonthlyWeightGoalPlanKey(option)),
        value: String(option),
      })),
    [monthlyGoalOptions, t]
  );
  const selectedGoalValue = profile ? String(profile.monthlyWeightGoalKg) : '';

  const handleSelectNewGoal = useCallback(
    (option: number) => {
      if (!profile) {
        return;
      }

      void upsertUserProfile({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        monthlyWeightGoalKg: option,
        activityLevel: profile.activityLevel,
      }).then(async (nextProfile) => {
        if (!nextProfile) {
          return;
        }

        await syncActiveGoalToProfile(nextProfile);
        setProfile(nextProfile);
        await loadNutritionData(selectedDate);
        await loadMonthStatuses(visibleMonth);
        await loadGoalTracking();
      });
    },
    [loadGoalTracking, loadMonthStatuses, loadNutritionData, profile, selectedDate, visibleMonth]
  );

  const handleGoalSelectChange = useCallback(
    (value: string) => {
      const parsedValue = Number(value);

      if (Number.isNaN(parsedValue) || !profile) {
        return;
      }

      if (parsedValue === profile.monthlyWeightGoalKg) {
        return;
      }

      appAlert.alert(
        t('goalTracking.changeGoalConfirmTitle'),
        t('goalTracking.changeGoalConfirmMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () => {
              handleSelectNewGoal(parsedValue);
            },
          },
        ]
      );
    },
    [appAlert, handleSelectNewGoal, profile, t]
  );

  const handleContinueGoal = useCallback(() => {
    void continueLatestCompletedGoal().then((didContinue) => {
      if (didContinue) {
        void loadGoalTracking();
      }
    });
  }, [loadGoalTracking]);

  const handleDeleteMeal = useCallback(
    (meal: FoodEntry) => {
      appAlert.alert(
        t('foodDetail.deleteTitle'),
        t('foodDetail.deleteMessage', { mealName: meal.mealName }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('foodDetail.deleteAction'),
            style: 'destructive',
            onPress: () => {
              void deleteFoodEntry(meal.id).then(async () => {
                await deleteOrphanedFoodEntryAssets(meal.imageUri, meal.thumbnailUri);
                await loadNutritionData(selectedDate);
                await loadGoalTracking();
              });
            },
          },
        ]
      );
    },
    [appAlert, loadGoalTracking, loadNutritionData, selectedDate, t]
  );

  let goalTrackingSection = null;

  if (hasProfile && activeGoalProgress) {
    const goalTitle = formatWeightGoalTitle(t, activeGoalProgress.goal);
    const isKcalGoal = activeGoalProgress.unit === 'kcal';

    goalTrackingSection = (
      <Card variant="filled" style={styles.goalTrackingCard}>
        <View style={styles.goalTrackingHeader}>
          <View style={styles.goalTrackingCopy}>
            <Text variant="h3">{`${t('goalTracking.activeTitle')}: ${goalTitle}`}</Text>
          </View>
          <Chip
            label={`${activeGoalProgress.progressPercent}%`}
            variant="outline"
            icon={<Icon name="trophy-outline" variant="accent" size={14} />}
          />
        </View>
        <View style={styles.goalProgressRow}>
          <View style={styles.goalProgressMetric}>
            <Text variant="bodySmall" color="secondary">
              {isKcalGoal ? activeGoalCopy?.progressLabel : activeGoalCopy?.remainingLabel}
            </Text>
          </View>
          <View style={[styles.goalProgressMetric, styles.goalProgressMetricEnd]}>
            <Text variant="bodySmall" color="secondary" align="right">
              {activeGoalCycleCopy ?? activeGoalCopy?.progressLabel}
            </Text>
          </View>
        </View>
        <ProgressBar value={activeGoalProgress.progressPercent} size="md" colorScheme="success" />
        {isKcalGoal ? (
          <Text variant="bodySmall" color="secondary">
            {activeGoalCopy?.remainingLabel}
          </Text>
        ) : null}
        <View style={styles.goalCardActions}>
          <Select
            value={selectedGoalValue}
            onChange={handleGoalSelectChange}
            options={goalSelectOptions}
            size="sm"
            triggerVariant="plain"
            placeholder={t('goalTracking.actions.chooseNew')}
          >
            <View style={styles.goalSelectTrigger}>
              <Icon name="swap-horizontal" size={16} variant="primary" />
              <Text variant="label" weight="semibold">
                {t('goalTracking.actions.chooseNew')}
              </Text>
            </View>
          </Select>
          <Button
            title={t('goalTracking.actions.viewHistory')}
            variant="ghost"
            size="sm"
            style={styles.goalActionButton}
            labelStyle={styles.goalActionButtonLabel}
            rightIcon={<Icon name="chevron-forward" variant="primary" size={16} />}
            onPress={() => router.push('/goal-history')}
          />
        </View>
      </Card>
    );
  } else if (hasProfile && latestCompletedGoal) {
    goalTrackingSection = (
      <Card variant="filled" style={styles.goalTrackingCard}>
        <View style={styles.goalTrackingCopy}>
          <Text variant="h3">{t('goalTracking.completedTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {formatWeightGoalTitle(t, latestCompletedGoal.goal)}
          </Text>
        </View>
        <View style={styles.goalActionRow}>
          <Button
            title={t('goalTracking.actions.continueGoal')}
            variant="primary"
            size="sm"
            onPress={handleContinueGoal}
          />
          <Select
            value={selectedGoalValue}
            onChange={handleGoalSelectChange}
            options={goalSelectOptions}
            size="sm"
            triggerVariant="plain"
            placeholder={t('goalTracking.actions.chooseNew')}
          >
            <View style={styles.goalSelectTrigger}>
              <Icon name="swap-horizontal" size={16} variant="primary" />
            </View>
          </Select>
        </View>
        <Button
          title={t('goalTracking.actions.viewHistory')}
          variant="ghost"
          size="sm"
          style={styles.goalActionButton}
          labelStyle={styles.goalActionButtonLabel}
          rightIcon={<Icon name="chevron-forward" variant="primary" size={16} />}
          onPress={() => router.push('/goal-history')}
        />
      </Card>
    );
  } else if (hasProfile) {
    goalTrackingSection = (
      <Card variant="filled" style={styles.goalTrackingCard}>
        <View style={styles.goalTrackingCopy}>
          <Text variant="h3">{t('goalTracking.emptyTitle')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('goalTracking.emptySubtitle')}
          </Text>
        </View>
        <Select
          value={selectedGoalValue}
          onChange={handleGoalSelectChange}
          options={goalSelectOptions}
          size="sm"
          triggerVariant="plain"
          placeholder={t('goalTracking.actions.startGoal')}
        >
          <View style={styles.goalSelectCallToAction}>
            <Icon name="flag-outline" size={16} variant="onBrand" />
            <Text variant="label" weight="semibold" color="onBrand">
              {t('goalTracking.actions.startGoal')}
            </Text>
          </View>
        </Select>
        <Button
          title={t('goalTracking.actions.viewHistory')}
          variant="ghost"
          size="sm"
          style={styles.goalActionButton}
          labelStyle={styles.goalActionButtonLabel}
          rightIcon={<Icon name="chevron-forward" variant="primary" size={16} />}
          onPress={() => router.push('/goal-history')}
        />
      </Card>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={mealSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View style={styles.mealSection}>
            <View style={styles.sectionTimeRow}>
              <Text variant="bodySmall" weight="semibold" color="secondary">
                {section.title}
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item: meal }) => (
          <View style={styles.itemTimelineRow}>
            <View style={styles.itemRail}>
              <View style={styles.itemDot} />
              <View style={styles.itemLine} />
            </View>

            <HomeMealCard.Root
              item={toHomeMealCardItem(meal)}
              onPress={() =>
                router.push({
                  pathname: '/food-form',
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
                      handleDeleteMeal(meal);
                    }}
                  />
                </HomeMealCard.Header>
                <HomeMealCard.Macros />
              </HomeMealCard.Content>
            </HomeMealCard.Root>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <MonthSelector
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              maxDate={new Date()}
              dayStatuses={monthStatuses}
              onMonthChange={setVisibleMonth}
            />

            {hasProfile ? (
              <LinearGradient colors={theme.colors.gradient.secondary} style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroBadge}>
                    <Icon name="flash" size={14} variant="secondary" />
                    <Text variant="caption" weight="semibold">
                      {`${t('profileScreen.metrics.maintenanceCalories')} ${profile?.maintenanceCalorieTarget ?? 0} ${t('common.units.kcal')}`}
                    </Text>
                  </View>
                  <View style={styles.dayPill}>
                    <Text variant="caption" weight="semibold">
                      {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text variant="caption" color="secondary">
                      {t('homeScreen.target')}
                    </Text>
                    <Text variant="h2">{summary.calorieTarget}</Text>
                    <Text variant="bodySmall" color="secondary">
                      {t('homeScreen.kcalToday')}
                    </Text>
                  </View>
                  <View style={[styles.heroStat, styles.heroStatEnd]}>
                    <Text variant="caption" color="secondary">
                      {t('homeScreen.remaining')}
                    </Text>
                    <Text
                      variant="h2"
                      align="right"
                      style={balanceCopy.color === 'accent' ? styles.remainingOverText : undefined}
                    >
                      {balanceCopy.value}
                    </Text>
                    <Text
                      variant="bodySmall"
                      color={balanceCopy.color}
                      align="right"
                      style={balanceCopy.color === 'accent' ? styles.remainingOverText : undefined}
                    >
                      {t(balanceCopy.labelKey)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <Text variant="bodySmall" weight="medium">
                    {t('homeScreen.progress')}
                  </Text>
                  <Text variant="bodySmall" weight="semibold">
                    {`${summary.consumedCalories} ${t('common.units.kcal')} (${summary.progressPercent}%)`}
                  </Text>
                </View>
                <ProgressBar
                  value={summary.progressPercent}
                  size="lg"
                  colorScheme={progressColorScheme}
                />

                {heroHighlight ? (
                  <View style={styles.heroHighlight}>
                    <View style={styles.heroHighlightIcon}>
                      <Icon
                        name={heroHighlight.icon}
                        size={16}
                        variant={heroHighlight.iconVariant}
                      />
                    </View>
                    <View style={styles.heroHighlightCopy}>
                      <Text variant="caption" color="secondary">
                        {heroHighlight.label}
                      </Text>
                      <Text variant="bodySmall" weight="semibold">
                        {heroHighlight.value}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={styles.macroGoalSection}>
                  <Text
                    variant="bodySmall"
                    weight="semibold"
                    align="center"
                    style={styles.macroGoalTitle}
                  >
                    {t('statsScreen.macros.title')}
                  </Text>

                  <View style={styles.quickStatsRow}>
                    <MacroGoalCard
                      current={summary.proteinGrams}
                      target={profile?.proteinTargetGrams ?? 0}
                      label={t('statsScreen.macros.protein')}
                      iconName="fish"
                      iconColor={theme.colors.state.info}
                      ringColor={theme.colors.state.info}
                      ringTrackColor={theme.colors.state.infoBg}
                    />
                    <MacroGoalCard
                      current={summary.carbsGrams}
                      target={profile?.carbsTargetGrams ?? 0}
                      label={t('statsScreen.macros.carbs')}
                      iconName="nutrition"
                      iconColor={theme.colors.state.warning}
                      ringColor={theme.colors.state.warning}
                      ringTrackColor={theme.colors.state.warningBg}
                    />
                    <MacroGoalCard
                      current={summary.fatGrams}
                      target={profile?.fatTargetGrams ?? 0}
                      label={t('statsScreen.macros.fat')}
                      iconName="water"
                      iconColor={theme.colors.state.success}
                      ringColor={theme.colors.state.success}
                      ringTrackColor={theme.colors.state.successBg}
                    />
                  </View>
                </View>
              </LinearGradient>
            ) : (
              <Card variant="filled" style={styles.profilePromptCard}>
                <View style={styles.profilePromptHeader}>
                  <View style={styles.profilePromptIcon}>
                    <Icon name="body-outline" size={18} variant="primary" />
                  </View>
                  <View style={styles.profilePromptCopy}>
                    <Text variant="h3">{t('homeScreen.profilePrompt.title')}</Text>
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

            {goalTrackingSection}

            {entries.length === 0 ? (
              <Card variant="filled" style={styles.emptyCard}>
                <Text variant="h3">{t('homeScreen.meals.emptyTitle')}</Text>
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
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    gap: theme.metrics.spacingV.p4,
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
    gap: theme.metrics.spacingV.p12,
  },
  sectionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.metrics.spacing.p20,
  },
  itemTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p8,
    paddingLeft: theme.metrics.spacing.p12,
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
}));

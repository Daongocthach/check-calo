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
  Icon,
  MonthSelector,
  ProgressBar,
  ScreenContainer,
  Text,
} from '@/common/components';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { MacroGoalCard } from '@/features/nutrition/components/MacroGoalCard';
import { deleteOrphanedFoodEntryAssets } from '@/features/nutrition/services/foodEntryImageSync';
import { getFoodEntryImageSyncStateMap } from '@/features/nutrition/services/foodEntrySyncQueue';
import {
  deleteFoodEntry,
  getDailyNutritionSummary,
  getUserProfile,
  listFoodEntriesByDate,
} from '@/features/nutrition/services/nutritionDatabase';
import type { DailyNutritionSummary, FoodEntry, UserProfile } from '@/features/nutrition/types';
import { useAppAlert } from '@/providers/app-alert';
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

  useFocusEffect(
    useCallback(() => {
      void loadNutritionData(selectedDate);
    }, [loadNutritionData, selectedDate])
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
              });
            },
          },
        ]
      );
    },
    [appAlert, loadNutritionData, selectedDate, t]
  );

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={mealSections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
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
                    <Text variant="h2" align="right">
                      {summary.remainingCalories}
                    </Text>
                    <Text variant="bodySmall" color="accent" align="right">
                      {summary.remainingCalories >= 0
                        ? t('homeScreen.onTrack')
                        : t('homeScreen.exceeded')}
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
                <ProgressBar value={summary.progressPercent} size="lg" colorScheme="success" />

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
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

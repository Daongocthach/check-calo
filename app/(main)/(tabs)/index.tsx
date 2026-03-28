import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, Icon, MonthSelector, ProgressBar, ScreenContainer, Text } from '@/common/components';
import { HomeMealCard } from '@/features/nutrition/components/HomeMealCard';
import {
  getDailyNutritionSummary,
  listFoodEntriesByDate,
  toggleFavoriteFoodEntry,
} from '@/features/nutrition/services/nutritionDatabase';
import type { DailyNutritionSummary, FoodEntry } from '@/features/nutrition/types';
import { vs } from '@/theme/metrics';

interface MealSection {
  title: string;
  data: FoodEntry[];
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
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [summary, setSummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(new Date())
  );
  const [entries, setEntries] = useState<FoodEntry[]>([]);

  const loadNutritionData = useCallback(async (date: Date) => {
    const [nextSummary, nextEntries] = await Promise.all([
      getDailyNutritionSummary(date),
      listFoodEntriesByDate(date),
    ]);

    setSummary(nextSummary);
    setEntries(nextEntries);
  }, []);

  useEffect(() => {
    void loadNutritionData(selectedDate);
  }, [loadNutritionData, selectedDate]);

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

  const handleFavoriteToggle = async (entryId: string) => {
    await toggleFavoriteFoodEntry(entryId);
    await loadNutritionData(selectedDate);
  };

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

            <HomeMealCard
              meal={meal}
              onPress={() =>
                router.push({
                  pathname: '/food-result',
                  params: {
                    mode: 'manual',
                    entryId: meal.id,
                  },
                })
              }
              onToggleFavorite={() => handleFavoriteToggle(meal.id)}
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <MonthSelector
              selectedDate={selectedDate}
              onChange={setSelectedDate}
              maxDate={new Date()}
            />

            <LinearGradient colors={theme.colors.gradient.secondary} style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Icon name="flash" size={14} variant="secondary" />
                  <Text variant="caption" weight="semibold">
                    {t('homeScreen.dailyIntake')}
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
                  <Text variant="h1">{summary.calorieTarget}</Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('homeScreen.kcalToday')}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text variant="caption" color="secondary">
                    {t('homeScreen.remaining')}
                  </Text>
                  <Text variant="h2">{summary.remainingCalories}</Text>
                  <Text variant="bodySmall" color="accent">
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
                  {summary.progressPercent}%
                </Text>
              </View>
              <ProgressBar value={summary.progressPercent} size="lg" colorScheme="success" />

              <View style={styles.quickStatsRow}>
                <View style={[styles.macroTile, styles.macroTileProtein]}>
                  <View style={styles.macroIconBadge}>
                    <Icon name="fish-outline" size={12} color={theme.colors.state.info} />
                  </View>
                  <Text variant="bodySmall" color="secondary" align="center">
                    {t('statsScreen.macros.protein')}
                  </Text>
                  <View style={styles.macroValueRow}>
                    <Text variant="h3">{Math.round(summary.proteinGrams)}</Text>
                    <Text variant="caption" color="secondary">
                      {t('addScreen.result.metrics.gramsShort')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.macroTile, styles.macroTileCarbs]}>
                  <View style={styles.macroIconBadge}>
                    <Icon name="nutrition-outline" size={12} color={theme.colors.state.warning} />
                  </View>
                  <Text variant="bodySmall" color="secondary" align="center">
                    {t('statsScreen.macros.carbs')}
                  </Text>
                  <View style={styles.macroValueRow}>
                    <Text variant="h3">{Math.round(summary.carbsGrams)}</Text>
                    <Text variant="caption" color="secondary">
                      {t('addScreen.result.metrics.gramsShort')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.macroTile, styles.macroTileFat]}>
                  <View style={styles.macroIconBadge}>
                    <Icon name="water" size={12} color={theme.colors.state.success} />
                  </View>
                  <Text variant="bodySmall" color="secondary" align="center">
                    {t('statsScreen.macros.fat')}
                  </Text>
                  <View style={styles.macroValueRow}>
                    <Text variant="h3">{Math.round(summary.fatGrams)}</Text>
                    <Text variant="caption" color="secondary">
                      {t('addScreen.result.metrics.gramsShort')}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

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
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  macroTile: {
    flex: 1,
    minHeight: theme.metrics.spacing.p84,
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.metrics.spacingV.p4,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    position: 'relative',
  },
  macroTileProtein: {
    backgroundColor: theme.colors.background.elevated,
  },
  macroTileCarbs: {
    backgroundColor: theme.colors.background.elevated,
  },
  macroTileFat: {
    backgroundColor: theme.colors.background.elevated,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p4,
    marginTop: theme.metrics.spacingV.p4,
  },
  macroIconBadge: {
    position: 'absolute',
    top: theme.metrics.spacing.p8,
    right: theme.metrics.spacing.p8,
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.modal,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
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

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, Icon, MonthSelector, ProgressBar, ScreenContainer, Text } from '@/common/components';
import { vs } from '@/theme/metrics';

interface FoodLogCard {
  id: string;
  title: string;
  time: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  icon: ComponentProps<typeof Icon>['name'];
  previewStyle: 'sunrisePreview' | 'greenPreview' | 'nightPreview';
}

export default function HomeTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const mealCards: FoodLogCard[] = [
    {
      id: 'beef-bowl',
      title: t('homeScreen.meals.items.beefBowl'),
      time: '19:10',
      calories: '475 kcal',
      protein: '34 g',
      carbs: '15 g',
      fat: '12 g',
      icon: 'restaurant-outline',
      previewStyle: 'nightPreview',
    },
    {
      id: 'kimchi-soup',
      title: t('homeScreen.meals.items.kimchiSoup'),
      time: '19:10',
      calories: '465 kcal',
      protein: '18 g',
      carbs: '28 g',
      fat: '16 g',
      icon: 'flame-outline',
      previewStyle: 'nightPreview',
    },
    {
      id: 'salmon-salad',
      title: t('homeScreen.meals.items.salmonSalad'),
      time: '13:05',
      calories: '430 kcal',
      protein: '31 g',
      carbs: '24 g',
      fat: '18 g',
      icon: 'fish-outline',
      previewStyle: 'greenPreview',
    },
    {
      id: 'greek-yogurt',
      title: t('homeScreen.meals.items.greekYogurt'),
      time: '13:05',
      calories: '180 kcal',
      protein: '8 g',
      carbs: '18 g',
      fat: '6 g',
      icon: 'ice-cream-outline',
      previewStyle: 'greenPreview',
    },
    {
      id: 'egg-toast',
      title: t('homeScreen.meals.items.eggToast'),
      time: '08:15',
      calories: '475 kcal',
      protein: '34 g',
      carbs: '15 g',
      fat: '12 g',
      icon: 'cafe-outline',
      previewStyle: 'sunrisePreview',
    },
    {
      id: 'banana-smoothie',
      title: t('homeScreen.meals.items.bananaSmoothie'),
      time: '08:15',
      calories: '210 kcal',
      protein: '9 g',
      carbs: '33 g',
      fat: '4 g',
      icon: 'nutrition-outline',
      previewStyle: 'sunrisePreview',
    },
  ];

  const mealSections = mealCards.reduce<Array<{ title: string; data: FoodLogCard[] }>>(
    (acc, meal) => {
      const existingSection = acc.find((section) => section.title === meal.time);

      if (existingSection) {
        existingSection.data.push(meal);
        return acc;
      }

      acc.push({ title: meal.time, data: [meal] });
      return acc;
    },
    []
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
        renderItem={({ item: meal }) => {
          return (
            <View style={styles.itemTimelineRow}>
              <View style={styles.itemRail}>
                <View style={styles.itemDot} />
                <View style={styles.itemLine} />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={meal.title}
                style={styles.mealPressable}
                onPress={() =>
                  router.push({
                    pathname: '/food-result',
                    params: {
                      mode: 'manual',
                      title: meal.title,
                      subtitle: meal.time,
                      calories: meal.calories,
                      carbs: meal.carbs,
                      protein: meal.protein,
                      fat: meal.fat,
                    },
                  })
                }
              >
                <Card variant="elevated" style={styles.mealCard}>
                  <View style={styles.mealMainRow}>
                    <View style={styles.mealCopy}>
                      <Text variant="h2">{meal.title}</Text>
                      <View style={styles.detailRow}>
                        <Text variant="caption" weight="semibold" color="accent">
                          {t('homeScreen.meals.detailComposition')}
                        </Text>
                        <Icon name="chevron-forward" variant="accent" size={14} />
                      </View>
                    </View>

                    <View style={[styles.mealPreview, styles[meal.previewStyle]]}>
                      <View style={styles.previewPlate}>
                        <Icon name={meal.icon} variant="inverse" size={28} />
                      </View>
                      <View style={styles.previewCalories}>
                        <Text variant="caption" weight="semibold" color="inverse">
                          {meal.calories}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.macroRow}>
                    <View style={styles.metricChip}>
                      <Text
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                        style={styles.metricLabel}
                      >
                        {t('statsScreen.macros.carbs')}
                      </Text>
                      <Text
                        variant="caption"
                        weight="semibold"
                        numberOfLines={1}
                        style={styles.metricValue}
                      >
                        {meal.carbs}
                      </Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Text
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                        style={styles.metricLabel}
                      >
                        {t('statsScreen.macros.protein')}
                      </Text>
                      <Text
                        variant="caption"
                        weight="semibold"
                        numberOfLines={1}
                        style={styles.metricValue}
                      >
                        {meal.protein}
                      </Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Text
                        variant="caption"
                        color="secondary"
                        numberOfLines={1}
                        style={styles.metricLabel}
                      >
                        {t('statsScreen.macros.fat')}
                      </Text>
                      <Text
                        variant="caption"
                        weight="semibold"
                        numberOfLines={1}
                        style={styles.metricValue}
                      >
                        {meal.fat}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </View>
          );
        }}
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
                    {t('homeScreen.dayCount')}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text variant="caption" color="secondary">
                    {t('homeScreen.target')}
                  </Text>
                  <Text variant="h1">1,840</Text>
                  <Text variant="bodySmall" color="secondary">
                    {t('homeScreen.kcalToday')}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text variant="caption" color="secondary">
                    {t('homeScreen.remaining')}
                  </Text>
                  <Text variant="h2">820</Text>
                  <Text variant="bodySmall" color="accent">
                    {t('homeScreen.onTrack')}
                  </Text>
                </View>
              </View>

              <View style={styles.progressHeader}>
                <Text variant="bodySmall" weight="medium">
                  {t('homeScreen.progress')}
                </Text>
                <Text variant="bodySmall" weight="semibold">
                  55%
                </Text>
              </View>
              <ProgressBar value={55} size="lg" colorScheme="success" />

              <View style={styles.quickStatsRow}>
                <View style={[styles.macroTile, styles.macroTileProtein]}>
                  <View style={styles.macroIconBadge}>
                    <Icon name="fish-outline" size={12} color={theme.colors.state.info} />
                  </View>
                  <Text variant="bodySmall" color="secondary" align="center">
                    {t('statsScreen.macros.protein')}
                  </Text>
                  <View style={styles.macroValueRow}>
                    <Text variant="h3">160</Text>
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
                    <Text variant="h3">48</Text>
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
                    <Text variant="h3">72</Text>
                    <Text variant="caption" color="secondary">
                      {t('addScreen.result.metrics.gramsShort')}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
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
  mealSection: {
    gap: theme.metrics.spacingV.p12,
  },
  sectionContent: {
    flex: 1,
    gap: theme.metrics.spacingV.p12,
  },
  sectionTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.metrics.spacing.p20,
  },
  sectionItems: {
    gap: theme.metrics.spacingV.p12,
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
  mealCard: {
    flex: 1,
    gap: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.surface,
  },
  mealPressable: {
    flex: 1,
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p12,
  },
  mealCopy: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.metrics.spacingV.p8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  mealPreview: {
    width: theme.metrics.spacing.p112,
    minHeight: theme.metrics.spacing.p96,
    borderRadius: theme.metrics.borderRadius.lg,
    padding: theme.metrics.spacing.p8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sunrisePreview: {
    backgroundColor: theme.colors.state.warning,
  },
  greenPreview: {
    backgroundColor: theme.colors.state.success,
  },
  nightPreview: {
    backgroundColor: theme.colors.brand.secondary,
  },
  previewPlate: {
    alignSelf: 'center',
    width: theme.metrics.spacing.p52,
    height: theme.metrics.spacing.p52,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.ripple,
  },
  previewCalories: {
    alignSelf: 'center',
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.overlay.modal,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  metricChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  metricLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
  metricValue: {
    flexShrink: 0,
  },
}));

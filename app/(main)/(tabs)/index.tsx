import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
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

  const mealSections = mealCards.reduce<Array<{ time: string; items: FoodLogCard[] }>>(
    (acc, meal) => {
      const existingSection = acc.find((section) => section.time === meal.time);

      if (existingSection) {
        existingSection.items.push(meal);
        return acc;
      }

      acc.push({ time: meal.time, items: [meal] });
      return acc;
    },
    []
  );

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
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
            <Card variant="filled" style={styles.quickStatCard}>
              <View style={[styles.quickIcon, styles.orangeBubble]}>
                <Icon name="footsteps-outline" variant="inverse" size={18} />
              </View>
              <Text variant="bodySmall" color="secondary">
                {t('homeScreen.steps')}
              </Text>
              <Text variant="h3">4,500</Text>
              <Text variant="caption" color="secondary">
                {t('homeScreen.stepsValue')}
              </Text>
            </Card>

            <Card variant="filled" style={styles.quickStatCard}>
              <View style={[styles.quickIcon, styles.blueBubble]}>
                <Icon name="water-outline" variant="inverse" size={18} />
              </View>
              <Text variant="bodySmall" color="secondary">
                {t('homeScreen.water')}
              </Text>
              <Text variant="h3">12</Text>
              <Text variant="caption" color="secondary">
                {t('homeScreen.waterValue')}
              </Text>
            </Card>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text variant="h2">{t('homeScreen.meals.title')}</Text>
          <Text variant="bodySmall" color="accent">
            {t('homeScreen.meals.subtitle')}
          </Text>
        </View>

        <View style={styles.mealList}>
          {mealSections.map((section) => (
            <View key={section.time} style={styles.mealSection}>
              <Text variant="h3">{section.time}</Text>

              {section.items.map((meal) => (
                <Card key={meal.id} variant="elevated" style={styles.mealCard}>
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
                      <Text variant="caption" color="secondary">
                        {t('statsScreen.macros.carbs')}
                      </Text>
                      <Text variant="caption" weight="semibold">
                        {meal.carbs}
                      </Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Text variant="caption" color="secondary">
                        {t('statsScreen.macros.protein')}
                      </Text>
                      <Text variant="caption" weight="semibold">
                        {meal.protein}
                      </Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Text variant="caption" color="secondary">
                        {t('statsScreen.macros.fat')}
                      </Text>
                      <Text variant="caption" weight="semibold">
                        {meal.fat}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
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
    gap: theme.metrics.spacing.p12,
  },
  quickStatCard: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
    backgroundColor: theme.colors.background.surface,
  },
  quickIcon: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeBubble: {
    backgroundColor: theme.colors.state.warning,
  },
  blueBubble: {
    backgroundColor: theme.colors.state.info,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  mealList: {
    gap: theme.metrics.spacingV.p12,
  },
  mealSection: {
    gap: theme.metrics.spacingV.p12,
  },
  mealCard: {
    gap: theme.metrics.spacingV.p12,
    backgroundColor: theme.colors.background.surface,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
}));

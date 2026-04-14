import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, ScreenContainer, Text } from '@/common/components';
import { HomeMealCard, type HomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { getUserProfile } from '@/features/nutrition/services/nutritionDatabase';
import type { UserProfile } from '@/features/nutrition/types';

interface MenuMealItem extends HomeMealCardItem {
  id: string;
}

interface MenuSection {
  title: string;
  subtitle: string;
  data: MenuMealItem[];
}

export default function MenuTab() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const sections = useMemo<MenuSection[]>(
    () => [
      {
        title: t('homeScreen.meals.breakfast'),
        subtitle: t('menuScreen.sectionSubtitles.breakfast'),
        data: [
          {
            id: 'breakfast-1',
            title: t('homeScreen.meals.items.eggToast'),
            quantityLabel: '2 lát',
            quantityGrams: 180,
            totalCalories: 420,
            proteinGrams: 21,
            carbsGrams: 34,
            fatGrams: 18,
            isFavorite: false,
          },
          {
            id: 'breakfast-2',
            title: t('homeScreen.meals.items.greekYogurt'),
            quantityLabel: '1 ly',
            quantityGrams: 150,
            totalCalories: 180,
            proteinGrams: 12,
            carbsGrams: 18,
            fatGrams: 6,
            isFavorite: false,
          },
        ],
      },
      {
        title: t('homeScreen.meals.lunch'),
        subtitle: t('menuScreen.sectionSubtitles.lunch'),
        data: [
          {
            id: 'lunch-1',
            title: t('homeScreen.meals.items.beefBowl'),
            quantityLabel: '1 tô',
            quantityGrams: 320,
            totalCalories: 560,
            proteinGrams: 32,
            carbsGrams: 58,
            fatGrams: 20,
            isFavorite: true,
          },
          {
            id: 'lunch-2',
            title: t('homeScreen.meals.items.salmonSalad'),
            quantityLabel: '1 phần',
            quantityGrams: 260,
            totalCalories: 390,
            proteinGrams: 28,
            carbsGrams: 20,
            fatGrams: 18,
            isFavorite: false,
          },
        ],
      },
      {
        title: t('homeScreen.meals.dinner'),
        subtitle: t('menuScreen.sectionSubtitles.dinner'),
        data: [
          {
            id: 'dinner-1',
            title: t('homeScreen.meals.items.kimchiSoup'),
            quantityLabel: '1 nồi nhỏ',
            quantityGrams: 340,
            totalCalories: 430,
            proteinGrams: 26,
            carbsGrams: 29,
            fatGrams: 17,
            isFavorite: false,
          },
        ],
      },
      {
        title: t('menuScreen.sections.snack'),
        subtitle: t('menuScreen.sectionSubtitles.snack'),
        data: [
          {
            id: 'snack-1',
            title: t('homeScreen.meals.items.bananaSmoothie'),
            quantityLabel: '1 chai',
            quantityGrams: 280,
            totalCalories: 310,
            proteinGrams: 10,
            carbsGrams: 48,
            fatGrams: 7,
            isFavorite: false,
          },
        ],
      },
    ],
    [t]
  );

  const totalCalories = useMemo(
    () =>
      sections.reduce(
        (sum, section) =>
          sum + section.data.reduce((sectionSum, item) => sectionSum + item.totalCalories, 0),
        0
      ),
    [sections]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getUserProfile().then((nextProfile) => {
        if (!active) {
          return;
        }

        setProfile(nextProfile);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderCopy}>
              <Text variant="h2">{t('menuScreen.totalCaloriesTitle')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('menuScreen.currentVsTargetCalories', {
                  current: Math.round(totalCalories),
                  target: Math.round(profile?.dailyCalorieTarget ?? 0),
                  kcal: t('common.units.kcal'),
                })}
              </Text>
            </View>
            <Button title={t('menuScreen.addMeal')} size="sm" onPress={() => router.push('/add')} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="h3">
              {t('menuScreen.sectionCalories', {
                title: section.title,
                value: Math.round(section.data.reduce((sum, item) => sum + item.totalCalories, 0)),
                kcal: t('common.units.kcal'),
              })}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {section.subtitle}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          return (
            <View style={styles.itemTimelineRow}>
              <View style={styles.itemRail}>
                <View style={styles.itemDot} />
                <View style={styles.itemLine} />
              </View>

              <HomeMealCard.Root item={item} onPress={() => undefined}>
                <HomeMealCard.Preview />
                <HomeMealCard.Content>
                  <HomeMealCard.Header>
                    <HomeMealCard.ActionButton
                      icon="trash-outline"
                      label={t('common.delete')}
                      tone="danger"
                      onPress={() => undefined}
                    />
                  </HomeMealCard.Header>
                  <HomeMealCard.Macros />
                </HomeMealCard.Content>
              </HomeMealCard.Root>
            </View>
          );
        }}
        SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p32,
    gap: theme.metrics.spacingV.p12,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p20,
  },
  pageHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeader: {
    marginBottom: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p4,
  },
  itemTimelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p8,
    paddingLeft: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p12,
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
  sectionSpacer: {
    height: theme.metrics.spacingV.p12,
  },
}));

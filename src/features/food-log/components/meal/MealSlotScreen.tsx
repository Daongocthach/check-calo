import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, ScreenHeader, Text } from '@/common/components';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { useBottomPadding } from '@/hooks';
import FALLBACK_MEAL_IMAGE from '../../../../../assets/fallback-meal.png';
import { useFoodLogQuery } from '../../hooks/useFoodLogQuery';
import { listFoodEntriesByDate } from '../../services/foodEntryRepository';
import { formatTime } from '../../utils/format';
import { getMealSlot, type MealSlot } from '../../utils/mealSlot';
import { MacroRings } from '../MacroRings';

export interface MealSlotScreenProps {
  date: string;
  slot: MealSlot;
}

async function loadSlot(date: string, slot: MealSlot) {
  const [entries, profile] = await Promise.all([listFoodEntriesByDate(date), getUserProfile()]);

  return {
    entries: entries
      .filter((entry) => getMealSlot(entry.consumedAt) === slot)
      .sort((left, right) => left.consumedAt.localeCompare(right.consumedAt)),
    profile,
  };
}

/** All foods logged in one meal slot of a day, with combined nutrition. */
export function MealSlotScreen({ date, slot }: MealSlotScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const bottomPadding = useBottomPadding({ withTabBar: false });
  const { data } = useFoodLogQuery(`slot:${date}:${slot}`, () => loadSlot(date, slot));
  const entries = data?.entries ?? [];
  const profile = data?.profile ?? null;
  const totals = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.totalCalories,
      protein: sum.protein + entry.proteinGrams,
      carbs: sum.carbs + entry.carbsGrams,
      fat: sum.fat + entry.fatGrams,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t(`mealSlots.${slot}`)} subtitle={date} />
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottom(bottomPadding)]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <MacroRings
            calories={totals.calories}
            proteinGrams={totals.protein}
            carbsGrams={totals.carbs}
            fatGrams={totals.fat}
            targets={{
              calories: profile?.dailyCalorieTarget ?? 0,
              proteinGrams: profile?.proteinTargetGrams ?? 0,
              carbsGrams: profile?.carbsTargetGrams ?? 0,
              fatGrams: profile?.fatTargetGrams ?? 0,
            }}
          />
        </View>
        {entries.map((entry) => {
          const cover = entry.thumbnailUri ?? entry.imageUri;

          return (
            <Pressable
              key={entry.id}
              onPress={() => router.push({ pathname: '/meal/[id]', params: { id: entry.id } })}
              accessibilityRole="button"
              style={styles.row}
            >
              <Image
                source={cover ? { uri: cover } : FALLBACK_MEAL_IMAGE}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={styles.rowText}>
                <Text variant="body" weight="semibold" numberOfLines={1}>
                  {entry.mealName}
                </Text>
                <Text variant="caption" color="secondary">
                  {[formatTime(entry.consumedAt, i18n.language), entry.quantityLabel]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text variant="body" weight="bold">
                {Math.round(entry.totalCalories)}
                <Text variant="caption" color="tertiary">
                  {` ${t('common.units.kcal')}`}
                </Text>
              </Text>
              <Icon name="chevron-forward" variant="tertiary" size={18} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
  },
  bottom: (bottomPadding: number) => ({
    paddingBottom: bottomPadding,
  }),
  card: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  thumb: {
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  rowText: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));

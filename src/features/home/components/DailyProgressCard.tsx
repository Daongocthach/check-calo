import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { BuddySticker, useBuddyName } from '@/features/buddy';
import type { MascotPose } from '@/features/buddy';
import { CalorieGauge, MacroProgress, NutrientList } from '@/features/food-log/components';
import { MACRO_KEYS } from '@/features/food-log/constants';
import type { DailyNutritionSummary } from '@/features/food-log/types';
import { EMPTY_NUTRIENTS } from '@/features/food-log/utils/nutrients';
import type { UserProfile } from '@/features/profile/types';
import { getCalorieRange, getDailyCalorieGoalState } from '@/features/profile/utils/calorie';
import type { DailyCalorieGoalState } from '@/features/profile/utils/calorie';
import { hs } from '@/theme/metrics';

export interface DailyProgressCardProps {
  summary: DailyNutritionSummary | null;
  profile: UserProfile | null;
}

/** Buddy's reaction once the day reaches the range. Over it gets a nudge, never a sad face. */
const MOODS = {
  on_target: { pose: 'celebrate', messageKey: 'home.buddyMood.onTarget' },
  above_target: { pose: 'stretch', messageKey: 'home.buddyMood.aboveTarget' },
} as const satisfies Partial<
  Record<DailyCalorieGoalState, { pose: MascotPose; messageKey: string }>
>;

export function DailyProgressCard({ summary, profile }: DailyProgressCardProps) {
  const { t } = useTranslation();
  const { name: buddyName } = useBuddyName();
  const [showNutrients, setShowNutrients] = useState(false);
  const consumed = Math.round(summary?.consumedCalories ?? 0);
  const target = Math.round(summary?.calorieTarget ?? profile?.dailyCalorieTarget ?? 0);
  // Judged the same way as the week strip and the goal card: by the day's own plan.
  const range = getCalorieRange(profile, target, summary?.goalMode);
  const state = getDailyCalorieGoalState(
    profile,
    target,
    summary?.consumedCalories ?? 0,
    summary?.date,
    summary?.goalMode
  );
  // Buddy reacts once the day lands in or past the range; below it the day is still in progress.
  const mood = consumed > 0 && target > 0 && state !== 'below_target' ? MOODS[state] : null;
  const macros = {
    carbs: {
      value: summary?.carbsGrams ?? 0,
      target: summary?.carbsTargetGrams ?? profile?.carbsTargetGrams ?? 0,
    },
    protein: {
      value: summary?.proteinGrams ?? 0,
      target: summary?.proteinTargetGrams ?? profile?.proteinTargetGrams ?? 0,
    },
    fat: {
      value: summary?.fatGrams ?? 0,
      target: summary?.fatTargetGrams ?? profile?.fatTargetGrams ?? 0,
    },
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" weight="bold">
          {t('home.dailyProgress')}
        </Text>
        <Text variant="body" weight="bold">
          {consumed}
          <Text variant="bodySmall" color="tertiary">
            {` / ${target} ${t('common.units.kcal')}`}
          </Text>
        </Text>
      </View>
      <CalorieGauge
        consumed={consumed}
        target={target}
        range={range}
        state={state}
        width={hs(310)}
        maximumValue={profile?.maintenanceCalorieTarget || undefined}
      />
      {mood ? (
        <View style={styles.mood}>
          <BuddySticker pose={mood.pose} size={hs(44)} />
          <Text variant="bodySmall" weight="semibold" style={styles.moodText}>
            {t(mood.messageKey, { name: buddyName })}
          </Text>
        </View>
      ) : null}
      <View style={styles.macros}>
        {MACRO_KEYS.map((key) => (
          <MacroProgress
            key={key}
            macro={key}
            value={macros[key].value}
            target={macros[key].target}
          />
        ))}
      </View>
      <Pressable
        style={styles.toggle}
        onPress={() => setShowNutrients((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showNutrients }}
      >
        <Text variant="bodySmall" weight="semibold" color="secondary">
          {t(showNutrients ? 'nutrients.hideDetails' : 'nutrients.showDetails')}
        </Text>
        <Icon name={showNutrients ? 'chevron-up' : 'chevron-down'} variant="secondary" size={16} />
      </Pressable>
      {showNutrients ? <NutrientList values={summary?.nutrients ?? EMPTY_NUTRIENTS} /> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: theme.colors.shadow.elevationSmall,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingRight: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  moodText: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  macros: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
}));

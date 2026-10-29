import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, ProgressBar, Text } from '@/common/components';
import type { UserProfile } from '@/features/profile/types';
import { isInTransition } from '@/features/profile/utils/calorie';
import { formatDateKey } from '@/utils/date';
import { useGoalTracking } from '../hooks/useGoalTracking';
import { formatWeightGoalTitle } from '../utils/goalTracking';
import { daysBetween } from '../utils/weightGoal';

/** The active goal at a glance on the dashboard; opens the Goal screen. */
export function GoalSummaryCard({ profile }: { profile: UserProfile | null }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { snapshot } = useGoalTracking();
  const goal = snapshot?.activeGoal ?? null;

  if (!goal) {
    return null;
  }

  const kgFormat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });
  const kg = t('common.units.kg');
  const weight = goal.weight;
  let detail = '';

  if (profile && isInTransition(profile) && profile.transitionUntil) {
    detail = t('goalTracking.transition.title', {
      count: daysBetween(formatDateKey(new Date()), profile.transitionUntil),
    });
  } else if (weight && goal.goal.mode !== 'maintain') {
    detail = t('goalSummary.route', {
      current: kgFormat.format(weight.currentKg),
      target: kgFormat.format(weight.targetKg),
      unit: kg,
    });
  } else if (weight) {
    detail = t('goalSummary.maintain', {
      current: kgFormat.format(weight.currentKg),
      unit: kg,
    });
  }

  return (
    <Pressable
      onPress={() => router.navigate('/goal')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Icon name="flag" variant="brand" size={18} />
        <Text variant="body" weight="bold" style={styles.flex} numberOfLines={1}>
          {formatWeightGoalTitle(t, goal.goal)}
        </Text>
        <Text variant="bodySmall" weight="bold" color="link">
          {`${Math.min(100, Math.max(0, Math.round(goal.progressPercent)))}%`}
        </Text>
        <Icon name="chevron-forward" variant="tertiary" size={16} />
      </View>
      <ProgressBar value={goal.progressPercent} size="sm" />
      {detail ? (
        <Text variant="caption" color="secondary">
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p8,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  pressed: {
    backgroundColor: theme.colors.overlay.hover,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  flex: {
    flex: 1,
  },
}));

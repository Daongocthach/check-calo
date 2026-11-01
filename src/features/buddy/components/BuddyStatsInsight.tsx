import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ProgressBar, Text } from '@/common/components';
import type { WeightGoalMode } from '@/features/goals/types';
import { hs } from '@/theme/metrics';
import type { MascotPose } from '../constants/mascot';
import { MIN_SCORED_DAYS } from '../constants/stats';
import type { BuddyAxis, BuddyStats } from '../types';
import { getBuddyInsight } from '../utils/buddyInsight';
import { BuddySticker } from './BuddySticker';

const STICKER_SIZE = hs(56);

/** The pose Buddy takes when talking about a stat that needs work. */
const WEAK_AXIS_POSES = {
  calories: 'focus',
  nutrients: 'gym',
  quality: 'water',
  timing: 'sleep',
  meals: 'noodles',
  consistency: 'checklist',
} as const satisfies Record<BuddyAxis, MascotPose>;

export interface BuddyStatsInsightProps {
  stats: BuddyStats;
  name: string;
  /** The goal today is planned under, which decides what the calorie stat asks for. */
  goalMode: WeightGoalMode;
}

/**
 * What Buddy says about the stats: its best one and the one that needs work, or how many
 * more days it needs before the stats show.
 */
export function BuddyStatsInsight({ stats, name, goalMode }: BuddyStatsInsightProps) {
  const { t } = useTranslation();

  if (stats.loggedDays < MIN_SCORED_DAYS) {
    return (
      <View style={styles.box}>
        <BuddySticker pose="wave" size={STICKER_SIZE} />
        <View style={styles.flex}>
          <Text variant="bodySmall" weight="bold">
            {t('buddy.stats.intro', { name })}
          </Text>
          <Text variant="caption" color="secondary">
            {t('buddy.stats.introHint', { count: MIN_SCORED_DAYS - stats.loggedDays })}
          </Text>
          <ProgressBar value={(100 * stats.loggedDays) / MIN_SCORED_DAYS} size="sm" />
        </View>
      </View>
    );
  }

  // The last week says more about how things are going; the overall stats fill the gaps.
  const insight = getBuddyInsight(stats.recent) ?? getBuddyInsight(stats.overall);

  if (!insight) {
    return null;
  }

  const { strongest, weakest } = insight;
  let weakText = t('buddy.insight.allGood', { name });

  if (weakest === 'calories') {
    weakText = t(`buddy.insight.weak.calories.${goalMode}`);
  } else if (weakest) {
    weakText = t(`buddy.insight.weak.${weakest}`, { name });
  }

  return (
    <View style={styles.box}>
      <BuddySticker pose={weakest ? WEAK_AXIS_POSES[weakest] : 'celebrate'} size={STICKER_SIZE} />
      <View style={styles.flex}>
        {strongest ? (
          <Text variant="bodySmall" weight="semibold">
            {t(`buddy.insight.strong.${strongest}`, { name })}
          </Text>
        ) : null}
        <Text variant="bodySmall" color="secondary">
          {weakText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.section,
  },
  flex: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));

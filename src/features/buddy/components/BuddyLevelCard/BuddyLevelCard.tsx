import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, ProgressBar, Text } from '@/common/components';
import { hs } from '@/theme/metrics';
import type { BuddyProgress } from '../../types';
import { BuddyMascot } from '../BuddyMascot';

export interface BuddyLevelCardProps {
  progress: BuddyProgress;
  streak: number;
  onPress?: () => void;
}

/** Mascot, level title, progress bar plus points and streak stats. */
export function BuddyLevelCard({ progress, streak, onPress }: BuddyLevelCardProps) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" style={styles.card}>
      <BuddyMascot level={progress.current.level} size={hs(104)} />
      <View style={styles.body}>
        <Text variant="h3" weight="bold">
          {t('buddy.levelTitle', {
            level: progress.current.level,
            stage: t(`buddy.stages.${progress.current.stage}`),
          })}
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.flex}>
            <ProgressBar value={progress.progressPercent} size="md" />
          </View>
          <Text variant="caption" weight="semibold" color="link">
            {`${progress.progressPercent}%`}
          </Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Icon name="star" variant="brand" size={18} />
            <View style={styles.flex}>
              <Text variant="body" weight="bold">
                {progress.points.toLocaleString()}
              </Text>
              <Text variant="caption" color="tertiary" numberOfLines={1}>
                {t('buddy.points')}
              </Text>
            </View>
          </View>
          <View style={styles.stat}>
            <Icon name="flame" variant="accent" size={18} />
            <View style={styles.flex}>
              <Text variant="body" weight="bold">
                {streak}
              </Text>
              <Text variant="caption" color="tertiary" numberOfLines={1}>
                {t('buddy.streakDays')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  body: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
}));

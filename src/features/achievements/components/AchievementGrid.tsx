import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import type { AchievementProgress } from '../types';

export function AchievementGrid({ items }: { items: AchievementProgress[] }) {
  const { t } = useTranslation();
  const unlockedCount = items.filter((item) => item.unlocked).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="body" weight="bold">
          {t('achievements.badges')}
        </Text>
        <Text variant="bodySmall" color="link" weight="semibold">
          {t('achievements.unlockedCount', { unlocked: unlockedCount, total: items.length })}
        </Text>
      </View>
      <View style={styles.grid}>
        {items.map(({ definition, value, unlocked }) => (
          <View key={definition.id} style={[styles.badge, !unlocked && styles.badgeLocked]}>
            <View style={styles.statusIcon}>
              <Icon
                name={unlocked ? 'checkmark-circle' : 'lock-closed'}
                variant={unlocked ? 'primary' : 'tertiary'}
                size={14}
              />
            </View>
            <View style={[styles.medal, unlocked && styles.medalUnlocked]}>
              <Icon name={definition.icon} variant={unlocked ? 'onBrand' : 'tertiary'} size={22} />
            </View>
            <Text variant="caption" weight="semibold" align="center" numberOfLines={2}>
              {t(`achievements.items.${definition.id}`)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, styles.fillWidth((value / definition.target) * 100)]} />
            </View>
            <Text variant="caption" color="tertiary">
              {unlocked ? t('achievements.done') : `${value}/${definition.target}`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  badge: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  badgeLocked: {
    opacity: 0.75,
  },
  statusIcon: {
    position: 'absolute',
    top: theme.metrics.spacing.p4,
    right: theme.metrics.spacing.p4,
  },
  medal: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  medalUnlocked: {
    backgroundColor: theme.colors.brand.primary,
  },
  track: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.border.default,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.brand.primary,
  },
  fillWidth: (percent: number) => ({
    width: `${Math.min(100, percent)}%`,
  }),
}));

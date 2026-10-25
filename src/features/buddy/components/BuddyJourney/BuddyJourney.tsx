import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { hs } from '@/theme/metrics';
import { BUDDY_LEVELS } from '../../constants/levels';
import type { BuddyLevel } from '../../types';
import { BuddyMascot } from '../BuddyMascot';

/** Horizontal row of all five growth stages with reached/current/locked states. */
export function BuddyJourney({ currentLevel }: { currentLevel: BuddyLevel }) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {BUDDY_LEVELS.map((level) => {
        const reached = level.level < currentLevel;
        const isCurrent = level.level === currentLevel;
        const locked = level.level > currentLevel;

        return (
          <View key={level.level} style={styles.item}>
            <View style={[styles.avatar, isCurrent && styles.avatarCurrent]}>
              <BuddyMascot level={level.level} size={hs(48)} locked={locked} />
              {reached ? (
                <View style={[styles.badge, styles.badgeReached]}>
                  <Icon name="checkmark" variant="onBrand" size={10} />
                </View>
              ) : null}
              {locked ? (
                <View style={[styles.badge, styles.badgeLocked]}>
                  <Icon name="lock-closed" variant="onBrand" size={10} />
                </View>
              ) : null}
            </View>
            <Text variant="caption" color={locked ? 'tertiary' : 'primary'}>
              {t('buddy.levelShort', { level: level.level })}
            </Text>
            <Text variant="caption" weight="semibold" color={isCurrent ? 'link' : 'secondary'}>
              {t(`buddy.stages.${level.stage}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  avatar: {
    width: hs(60),
    height: hs(60),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarCurrent: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.background.surface,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: theme.metrics.spacing.p16,
    height: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeReached: {
    backgroundColor: theme.colors.brand.primary,
  },
  badgeLocked: {
    backgroundColor: theme.colors.text.tertiary,
  },
}));

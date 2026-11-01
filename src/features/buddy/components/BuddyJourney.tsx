import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { hs } from '@/theme/metrics';
import { BUDDY_STAGE_LEVELS } from '../constants/levels';
import type { BuddyLevel, BuddyLevelDefinition } from '../types';
import { BuddyMascot } from './BuddyMascot';
import { BuddyPreview } from './BuddyPreview';

/**
 * Horizontal row of the five growth stages (two levels each) with reached/current/locked
 * states. Tapping a stage opens it full screen.
 */
export function BuddyJourney({ currentLevel }: { currentLevel: BuddyLevel }) {
  const { t } = useTranslation();
  const [previewLevel, setPreviewLevel] = useState<BuddyLevelDefinition | null>(null);

  return (
    <View style={styles.row}>
      {BUDDY_STAGE_LEVELS.map(({ first: level, last }) => {
        const reached = last.level < currentLevel;
        const isCurrent = level.level <= currentLevel && currentLevel <= last.level;
        const locked = level.level > currentLevel;

        return (
          <Pressable
            key={level.level}
            onPress={() => setPreviewLevel(level)}
            accessibilityRole="button"
            accessibilityLabel={t('buddy.levelTitle', {
              level: level.level,
              stage: t(`buddy.stages.${level.stage}`),
            })}
            style={styles.item}
          >
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
              {t('buddy.levelRange', { from: level.level, to: last.level })}
            </Text>
            <Text variant="caption" weight="semibold" color={isCurrent ? 'link' : 'secondary'}>
              {t(`buddy.stages.${level.stage}`)}
            </Text>
          </Pressable>
        );
      })}
      <BuddyPreview
        level={previewLevel}
        locked={previewLevel ? previewLevel.level > currentLevel : false}
        onClose={() => setPreviewLevel(null)}
      />
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

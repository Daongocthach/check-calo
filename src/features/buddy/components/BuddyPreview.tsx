import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { useBuddyName } from '../hooks/useBuddyName';
import type { BuddyLevelDefinition } from '../types';
import { BuddyMascot } from './BuddyMascot';

/** Largest mascot size, so tablets don't blow the pixel art up past its source resolution. */
const MAX_SIZE = 420;

export interface BuddyPreviewProps {
  /** Level to show; `null` keeps the preview closed. */
  level: BuddyLevelDefinition | null;
  locked: boolean;
  onClose: () => void;
}

/** Full-screen look at a growth stage: the mascot large on a dimmed backdrop, tap to close. */
export function BuddyPreview({ level, locked, onClose }: BuddyPreviewProps) {
  const { t } = useTranslation();
  const { name } = useBuddyName();
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.85, MAX_SIZE);

  return (
    <Modal
      visible={level !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false}>
        {level ? (
          <View style={styles.content}>
            <BuddyMascot level={level.level} size={size} animated />
            <Text variant="h2" weight="bold" color="onShadow" align="center">
              {t('buddy.levelTitle', {
                level: level.level,
                stage: t(`buddy.stages.${level.stage}`),
              })}
            </Text>
            {locked ? (
              <Text variant="bodySmall" color="onShadow" align="center">
                {t('buddy.nextRewardHint', {
                  points: level.minPoints,
                  name,
                  stage: t(`buddy.stages.${level.stage}`),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
        >
          <Icon name="close" variant="onBrand" size={22} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p24,
    backgroundColor: theme.colors.overlay.scrim,
  },
  content: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p12,
  },
  closeButton: {
    position: 'absolute',
    top: rt.insets.top + theme.metrics.spacingV.p8,
    right: theme.metrics.spacing.p16,
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
}));

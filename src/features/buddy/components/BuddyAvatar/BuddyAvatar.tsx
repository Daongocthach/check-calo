import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, AVATAR_SIZES, Text } from '@/common/components';
import { useBuddyHeaderPose } from '../../hooks/useBuddyHeaderPose';
import { useBuddyName } from '../../hooks/useBuddyName';
import { BuddySticker } from '../BuddySticker';

export interface BuddyAvatarProps {
  onPress: () => void;
}

/**
 * The pet in a round frame; stands in for the user avatar in headers. Its pose follows the time
 * of day and today's milestones, and the level sits in the corner badge.
 */
export function BuddyAvatar({ onPress }: BuddyAvatarProps) {
  const { t } = useTranslation();
  const { name } = useBuddyName();
  const { pose, level } = useBuddyHeaderPose();
  const label = level
    ? `${t('buddy.openBuddy', { name })}, ${t('buddy.levelShort', { level })}`
    : t('buddy.openBuddy', { name });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Avatar size="lg" tone="muted" icon={<BuddySticker pose={pose} size={AVATAR_SIZES.lg} />} />
      {level ? (
        <View style={styles.level}>
          <Text variant="caption" weight="bold" color="inverse">
            {level}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  pressed: {
    opacity: 0.8,
  },
  level: {
    position: 'absolute',
    right: -theme.metrics.spacing.p4,
    bottom: -theme.metrics.spacing.p4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    paddingHorizontal: theme.metrics.spacing.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.background.app,
  },
}));

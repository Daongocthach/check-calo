import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, Text } from '@/common/components';
import { hs } from '@/theme/metrics';

export interface HomeHeaderProps {
  displayName: string;
  avatarUri?: string | null;
  streak: number;
  onStreakPress: () => void;
  onMenuPress: () => void;
  onAvatarPress?: () => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';

  return `${first}${last}`.toUpperCase();
}

export function HomeHeader({
  displayName,
  avatarUri,
  streak,
  onStreakPress,
  onMenuPress,
  onAvatarPress,
}: HomeHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.changeAvatar')}
        style={styles.avatarWrap}
      >
        <Avatar
          source={avatarUri ? { uri: avatarUri } : undefined}
          initials={getInitials(displayName) || '?'}
          size="lg"
        />
        <View style={styles.avatarEdit}>
          <Icon name="camera" variant="brand" size={hs(11)} />
        </View>
      </Pressable>
      <View style={styles.textWrap}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.greeting}>
          {t('home.greeting', { name: displayName })}
        </Text>
        <Text variant="bodySmall" color="secondary" numberOfLines={1}>
          {t('home.subtitle')}
        </Text>
      </View>
      <Pressable
        onPress={onStreakPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.streakLabel', { count: streak })}
        style={styles.action}
      >
        <Icon name="flame" variant="accent" sizeVariant="md" />
        {streak > 0 ? (
          <View style={styles.badge}>
            <Text variant="caption" weight="bold" color="inverse">
              {streak}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onMenuPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.openMenu')}
        style={styles.action}
      >
        <Icon name="menu" sizeVariant="md" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarEdit: {
    position: 'absolute',
    right: -hs(2),
    bottom: -hs(2),
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.default,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: theme.colors.shadow.elevationSmall,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  greeting: {
    fontSize: theme.fonts.size.lg,
  },
  action: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: theme.colors.shadow.elevationSmall,
  },
  badge: {
    position: 'absolute',
    top: -theme.metrics.spacing.p4,
    right: -theme.metrics.spacing.p4,
    minWidth: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    paddingHorizontal: theme.metrics.spacing.p4,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.error,
    borderWidth: 1.5,
    borderColor: theme.colors.background.surface,
  },
}));

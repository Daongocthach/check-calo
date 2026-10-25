import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, IconButton, Text } from '@/common/components';

export interface HomeHeaderProps {
  displayName: string;
  streak: number;
  onStreakPress: () => void;
  onMenuPress: () => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';

  return `${first}${last}`.toUpperCase();
}

export function HomeHeader({ displayName, streak, onStreakPress, onMenuPress }: HomeHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Avatar initials={getInitials(displayName) || '?'} size="md" />
      <View style={styles.textWrap}>
        <Text variant="h3" weight="bold" numberOfLines={1}>
          {t('home.greeting', { name: displayName })}
        </Text>
        <Text variant="bodySmall" color="secondary">
          {t('home.subtitle')}
        </Text>
      </View>
      <Pressable
        onPress={onStreakPress}
        accessibilityRole="button"
        accessibilityLabel={t('home.streakLabel', { count: streak })}
        style={styles.streakButton}
      >
        <Icon name="flame" variant="accent" size={22} />
        {streak > 0 ? (
          <View style={styles.streakBadge}>
            <Text variant="caption" color="inverse">
              {streak}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <IconButton
        icon="menu"
        variant="outline"
        onPress={onMenuPress}
        accessibilityLabel={t('home.openMenu')}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p12,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  streakButton: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  streakBadge: {
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
  },
}));

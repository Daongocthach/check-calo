import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Avatar, Icon, Text } from '@/common/components';

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
  textWrap: {
    flex: 1,
    minWidth: 0,
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

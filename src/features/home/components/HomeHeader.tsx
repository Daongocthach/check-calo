import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { BuddyAvatar } from '@/features/buddy';

export interface HomeHeaderProps {
  displayName: string;
  onBuddyPress: () => void;
  onMenuPress: () => void;
}

/** Pet avatar (opens Buddy), greeting and the drawer button. The streak sits beside the date picker. */
export function HomeHeader({ displayName, onBuddyPress, onMenuPress }: HomeHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <BuddyAvatar onPress={onBuddyPress} />
      <View style={styles.textWrap}>
        <Text variant="body" weight="semibold" numberOfLines={1} style={styles.greeting}>
          {t('home.greeting', { name: displayName })}
        </Text>
        <Text variant="bodySmall" color="secondary" numberOfLines={1}>
          {t('home.subtitle')}
        </Text>
      </View>
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
}));

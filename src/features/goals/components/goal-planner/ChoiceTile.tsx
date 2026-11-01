import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

type IconName = ComponentProps<typeof Icon>['name'];

export function ChoiceTile({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.tile, selected && styles.tileSelected]}
    >
      <View style={styles.tileIcon}>
        <Icon name={icon} variant="accent" size={22} />
      </View>
      <Text variant="bodySmall" weight="bold" align="center">
        {title}
      </Text>
      <Text variant="caption" color="secondary" align="center">
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  tileSelected: {
    borderColor: theme.colors.state.success,
    backgroundColor: theme.colors.state.successBg,
  },
  tileIcon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
}));

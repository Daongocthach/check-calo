import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

type IconName = ComponentProps<typeof Icon>['name'];

export function SectionCard({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitle}>
        <Icon name={icon} variant="brand" size={18} />
        <Text variant="body" weight="bold">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function OptionPill({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      {icon ? <Icon name={icon} variant={selected ? 'onBrand' : 'secondary'} size={16} /> : null}
      <Text variant="bodySmall" weight="semibold" color={selected ? 'onBrand' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
  },
  pillSelected: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary,
  },
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

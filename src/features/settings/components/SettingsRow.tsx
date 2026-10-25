import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

type IconName = ComponentProps<typeof Icon>['name'];

export interface SettingsRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  external?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  right,
  destructive = false,
  external = false,
}: SettingsRowProps) {
  const content = (
    <>
      <View style={styles.iconWrap}>
        <Icon name={icon} variant="brand" size={18} destructive={destructive} />
      </View>
      <View style={styles.text}>
        <Text variant="body" weight="medium" style={destructive && styles.destructive}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySmall" color="secondary">
          {value}
        </Text>
      ) : null}
      {right ??
        (onPress ? (
          <Icon name={external ? 'open-outline' : 'chevron-forward'} variant="tertiary" size={18} />
        ) : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="bodySmall" weight="semibold" color="secondary">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  group: {
    gap: theme.metrics.spacingV.p8,
  },
  card: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  pressed: {
    backgroundColor: theme.colors.overlay.hover,
  },
  iconWrap: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  text: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  destructive: {
    color: theme.colors.state.error,
  },
}));

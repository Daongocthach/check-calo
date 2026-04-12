import { UniIonicons } from '@/common/components/uni';
import type { IconProps } from './Icon.types';

/**
 * Renders an Ionicons vector icon with theme-aware color and sizing.
 *
 * @example
 * ```tsx
 * <Icon name="checkmark-circle" variant="accent" sizeVariant="lg" />
 * ```
 */
export function Icon({
  name,
  variant = 'primary',
  size = 24,
  sizeVariant,
  color,
  destructive,
  accessibilityLabel,
}: IconProps) {
  return (
    <UniIonicons
      name={name}
      size={size}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      uniProps={(theme) => {
        const variantColorMap = {
          primary: theme.colors.icon.primary,
          secondary: theme.colors.icon.secondary,
          tertiary: theme.colors.icon.tertiary,
          muted: theme.colors.icon.muted,
          inverse: theme.colors.icon.inverse,
          accent: theme.colors.icon.accent,
          onBrand: theme.colors.brand.onBrand,
        };

        return {
          color: destructive ? theme.colors.state.error : (color ?? variantColorMap[variant]),
          ...(sizeVariant !== undefined && { size: theme.metrics.iconSize[sizeVariant] }),
        };
      }}
    />
  );
}

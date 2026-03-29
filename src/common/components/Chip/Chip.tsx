import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useUnistyles } from 'react-native-unistyles';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { styles } from './Chip.styles';
import type { ChipProps } from './Chip.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A compact element used for selections, filters, or tags.
 *
 * @example
 * ```tsx
 * <Chip label="Featured" variant="solid" selected onPress={() => {}} />
 * ```
 */
export function Chip({
  label,
  text,
  variant = 'outline',
  size = 'md',
  selected = false,
  color,
  onPress,
  onClose,
  icon,
  disabled = false,
}: ChipProps) {
  const { theme } = useUnistyles();
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();
  const content = text ?? label ?? '';
  const isFilled = selected || variant === 'solid';

  let containerColorStyle:
    | {
        backgroundColor?: string;
        borderColor?: string;
      }
    | undefined;
  let labelColorStyle:
    | {
        color: string;
      }
    | undefined;
  let closeIconColor: string | undefined;

  if (color !== undefined) {
    if (isFilled) {
      containerColorStyle = { backgroundColor: color, borderColor: color };
      labelColorStyle = { color: theme.colors.text.primary };
      closeIconColor = theme.colors.text.primary;
    } else {
      containerColorStyle = { borderColor: color };
      labelColorStyle = { color };
      closeIconColor = color;
    }
  }

  styles.useVariants({ variant, size, selected, disabled });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={content}
      accessibilityState={{ selected, disabled }}
      style={[styles.container, containerColorStyle, animatedStyle]}
    >
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text
        variant={size === 'sm' ? 'caption' : 'bodySmall'}
        weight="medium"
        style={[styles.label, labelColorStyle]}
      >
        {content}
      </Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${content}`}
        >
          <Icon
            name="close-circle"
            sizeVariant={size === 'sm' ? 'xs' : 'sm'}
            variant="muted"
            color={closeIconColor}
          />
        </Pressable>
      )}
    </AnimatedPressable>
  );
}

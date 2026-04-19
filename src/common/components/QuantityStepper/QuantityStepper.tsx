import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';

export interface QuantityStepperProps {
  value: number;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  minValue?: number;
  style?: StyleProp<ViewStyle>;
}

export function QuantityStepper({
  value,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  minValue = 0,
  style,
}: QuantityStepperProps) {
  const isDecreaseDisabled = value <= minValue;

  return (
    <Pressable style={[styles.stepper, style]} accessibilityRole="adjustable">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: isDecreaseDisabled }}
        disabled={isDecreaseDisabled}
        style={[styles.stepperButton, isDecreaseDisabled && styles.stepperButtonDisabled]}
        onPress={onDecrease}
      >
        <Icon name="remove" variant="primary" size={16} />
      </Pressable>
      <Text variant="bodySmall" weight="semibold">
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        style={styles.stepperButton}
        onPress={onIncrease}
      >
        <Icon name="add" variant="primary" size={16} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  stepperButton: {
    width: theme.metrics.spacing.p28,
    height: theme.metrics.spacing.p28,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
}));

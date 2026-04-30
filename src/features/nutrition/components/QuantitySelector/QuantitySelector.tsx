import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { QuantityStepper, Text } from '@/common/components';

export interface QuantitySelectorProps {
  value: number;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
  label?: string;
  minValue?: number;
  style?: StyleProp<ViewStyle>;
  stepperStyle?: StyleProp<ViewStyle>;
}

export function QuantitySelector({
  value,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
  label,
  minValue = 0,
  style,
  stepperStyle,
}: QuantitySelectorProps) {
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text variant="bodySmall" weight="semibold">
          {label}
        </Text>
      ) : null}
      <QuantityStepper
        value={value}
        minValue={minValue}
        decreaseLabel={decreaseLabel}
        increaseLabel={increaseLabel}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        style={stepperStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
}));

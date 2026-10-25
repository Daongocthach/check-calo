import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Slider, Text } from '@/common/components';

export interface MetricSliderCardProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function MetricSliderCard({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: MetricSliderCardProps) {
  return (
    <View style={styles.card}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text variant="h2" weight="bold">
          {Math.round(value)}
        </Text>
        <Text variant="bodySmall" color="secondary">
          {unit}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        onValueChange={onChange}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
    gap: theme.metrics.spacingV.p4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
}));

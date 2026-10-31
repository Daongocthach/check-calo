import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';

interface RadioChoiceProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function RadioChoice({ label, selected, onPress }: RadioChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
      <Text
        variant="bodySmall"
        weight="semibold"
        color={selected ? 'link' : 'primary'}
        style={styles.choiceText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface RadioChoiceGroupProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Two choices per row instead of all in one row. */
  wrap?: boolean;
}

export function RadioChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
}: RadioChoiceGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup" style={[styles.row, wrap && styles.wrap]}>
      {options.map((option) => (
        <View key={option.value} style={wrap ? styles.half : styles.item}>
          <RadioChoice
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', gap: theme.metrics.spacing.p8 },
  wrap: { flexWrap: 'wrap' },
  item: { flex: 1, minWidth: 0 },
  half: { width: '48%', flexGrow: 1 },
  choice: {
    minHeight: theme.metrics.spacing.p40,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  selected: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.overlay.hover,
  },
  choiceText: { flexShrink: 1 },
  radio: {
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: theme.colors.brand.primary },
  dot: {
    width: theme.metrics.spacing.p12,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
  },
}));

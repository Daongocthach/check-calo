import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.metrics.spacingV.p16 },
  fieldGroup: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p8,
  },
  row: { flexDirection: 'row', gap: theme.metrics.spacing.p8 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  stepButton: {
    width: theme.metrics.spacing.p28,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.md,
    backgroundColor: theme.colors.overlay.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  number: { minWidth: theme.metrics.spacing.p24, paddingHorizontal: 0 },
}));

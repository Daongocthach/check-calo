import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  card: {
    padding: theme.metrics.spacing.p12,
    gap: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
  },
  stats: { flexDirection: 'row', gap: theme.metrics.spacing.p4 },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  bmiNumberRow: { flexDirection: 'row', alignItems: 'center', gap: theme.metrics.spacing.p8 },
  bmiLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.metrics.spacing.p8 },
  legendItem: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
  },
  legendDot: {
    width: theme.metrics.spacing.p8,
    height: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
  },
  legendText: { flex: 1, minWidth: 0 },
  badge: {
    flexShrink: 1,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
  },
  scale: { flexDirection: 'row', gap: theme.metrics.spacing.p4 },
  bar: {
    flex: 1,
    minWidth: 0,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
  },
  underweight: { backgroundColor: theme.colors.gradient.highlight[1] },
  normal: { backgroundColor: theme.colors.state.successBg },
  overweight: { backgroundColor: theme.colors.state.warningBg },
  obese: { backgroundColor: theme.colors.state.errorBg },
  marker: { position: 'absolute', top: -theme.metrics.spacing.p4, alignSelf: 'center' },
  status: { color: theme.colors.state.success },
  warning: { color: theme.colors.state.warning },
}));

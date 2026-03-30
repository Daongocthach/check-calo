import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  chartWrap: {
    overflow: 'hidden',
    gap: theme.metrics.spacingV.p12,
  },
  axisText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
  },
  stackValueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.section,
  },
  legendDot: {
    width: theme.metrics.spacing.p12,
    height: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.full,
  },
  proteinDot: {
    backgroundColor: theme.colors.state.info,
  },
  carbsDot: {
    backgroundColor: theme.colors.state.warning,
  },
  fatDot: {
    backgroundColor: theme.colors.state.success,
  },
}));

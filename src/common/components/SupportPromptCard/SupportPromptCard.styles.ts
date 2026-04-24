import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.state.warningBg,
    shadowColor: theme.colors.shadow.color,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p4 },
    shadowOpacity: 0.06,
    shadowRadius: theme.metrics.spacing.p8,
    elevation: theme.colors.shadow.elevationSmall,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  leftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  iconWrap: {
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.warningBg,
  },
  message: {
    flex: 1,
    lineHeight: 20,
  },
  actionButton: {
    minHeight: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.lg,
  },
}));

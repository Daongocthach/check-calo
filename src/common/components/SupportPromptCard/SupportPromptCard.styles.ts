import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.state.warningBg,
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
    alignItems: 'center',
    gap: theme.metrics.spacing.p24,
  },
  iconWrap: {
    width: theme.metrics.spacing.p72,
    height: theme.metrics.spacing.p72,
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: theme.metrics.spacing.p80,
    height: theme.metrics.spacing.p80,
  },
  contentBlock: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  messageWrap: {
    flex: 1,
    paddingTop: theme.metrics.spacingV.p4,
  },
  message: {
    flex: 1,
    lineHeight: 20,
    textAlign: 'left',
  },
  actionButton: {
    minHeight: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.lg,
  },
}));

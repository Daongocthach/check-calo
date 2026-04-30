import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  sheetContent: {
    flexGrow: 1,
    gap: theme.metrics.spacingV.p16,
  },
  header: {
    minHeight: theme.metrics.spacing.p56,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p16,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  subtitle: {
    lineHeight: theme.fonts.size.lg,
  },
  sparkleGroup: {
    width: theme.metrics.spacing.p56,
    minHeight: theme.metrics.spacing.p48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    alignItems: 'flex-end' as const,
    gap: theme.metrics.spacingV.p8,
  },
  headerActionButtons: {
    flexDirection: 'row' as const,
    gap: theme.metrics.spacing.p8,
  },
  footerActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: theme.metrics.spacing.p8,
  },
}));

import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacing.p12,
    backgroundColor: theme.colors.background.app,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  iconButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
}));

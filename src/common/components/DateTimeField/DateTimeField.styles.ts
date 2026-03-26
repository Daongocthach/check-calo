import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  wrapper: {
    gap: theme.metrics.spacingV.p4,
  },
  label: {
    color: theme.colors.text.secondary,
  },
  trigger: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.input,
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerError: {
    borderColor: theme.colors.state.error,
  },
  valueText: {
    flex: 1,
    color: theme.colors.text.primary,
  },
  placeholderText: {
    flex: 1,
    color: theme.colors.text.muted,
  },
  errorText: {
    color: theme.colors.state.error,
  },
  sheetBackground: {
    backgroundColor: theme.colors.background.surface,
  },
  sheetHandle: {
    backgroundColor: theme.colors.border.default,
  },
  sheetContent: {
    backgroundColor: theme.colors.background.modal,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p4,
    gap: theme.metrics.spacingV.p12,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.metrics.spacingV.p4,
  },
  title: {
    textAlign: 'center' as const,
  },
  pickerSurface: {
    marginTop: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
    alignItems: 'center' as const,
  },
  picker: {
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    gap: theme.metrics.spacing.p8,
    paddingTop: theme.metrics.spacingV.p8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  bottomSafeArea: {
    backgroundColor: theme.colors.background.modal,
  },
}));

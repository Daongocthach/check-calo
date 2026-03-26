import { StyleSheet, type UnistylesVariants } from 'react-native-unistyles';

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
    backgroundColor: theme.colors.background.input,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    variants: {
      size: {
        sm: {
          paddingHorizontal: theme.metrics.spacing.p8,
          paddingVertical: theme.metrics.spacingV.p8,
        },
        md: {
          paddingHorizontal: theme.metrics.spacing.p12,
          paddingVertical: theme.metrics.spacingV.p12,
        },
        lg: {
          paddingHorizontal: theme.metrics.spacing.p16,
          paddingVertical: theme.metrics.spacingV.p16,
        },
      },
      error: {
        true: {
          borderColor: theme.colors.state.error,
        },
      },
      disabled: {
        true: {
          opacity: 0.5,
        },
      },
      triggerVariant: {
        default: {},
        plain: {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          borderRadius: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        },
      },
    },
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p8,
    minWidth: 0,
  },
  selectedText: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text.primary,
  },
  placeholderText: {
    flex: 1,
    minWidth: 0,
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
  listContent: {
    paddingVertical: theme.metrics.spacingV.p8,
  },
  listContentWithSearch: {
    paddingTop: 0,
  },
  searchContainer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p4,
    backgroundColor: theme.colors.background.surface,
  },
  headerSafeArea: {
    backgroundColor: theme.colors.background.surface,
  },
  footerContainer: {
    backgroundColor: theme.colors.background.surface,
  },
  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.metrics.spacingV.p12,
  },
  footerSafeArea: {
    backgroundColor: theme.colors.background.surface,
    minHeight: theme.metrics.spacingV.p8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p20,
  },
  emptyText: {
    color: theme.colors.text.muted,
    textAlign: 'center' as const,
  },
  option: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: theme.metrics.spacingV.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    marginHorizontal: theme.metrics.spacing.p8,
    marginVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.lg,
    variants: {
      disabled: {
        true: {
          opacity: 0.5,
        },
      },
    },
  },
  optionSelected: {
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.focus,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.metrics.spacing.p12,
    minWidth: 0,
  },
  optionIcon: {
    width: theme.metrics.spacing.p24,
    height: theme.metrics.spacingV.p16,
    borderRadius: theme.metrics.borderRadius.xs,
  },
  optionText: {
    color: theme.colors.text.primary,
  },
  optionTextSelected: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
}));

export type SelectStyleVariants = UnistylesVariants<typeof styles>;

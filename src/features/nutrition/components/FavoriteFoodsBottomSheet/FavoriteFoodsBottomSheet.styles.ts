import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.metrics.borderRadius.xl,
    borderTopRightRadius: theme.metrics.borderRadius.xl,
  },
  sheetHandle: {
    width: theme.metrics.spacing.p40,
    backgroundColor: theme.colors.border.default,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
    marginBottom: theme.metrics.spacingV.p12,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  sheetCloseButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  sheetList: {
    gap: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p20,
  },
  sheetEmptyCard: {
    gap: theme.metrics.spacingV.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
  },
}));

import { StyleSheet } from 'react-native-unistyles';
import { hs } from '@/theme/metrics';

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
    paddingBottom: theme.metrics.spacingV.p16,
  },
  header: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
    marginBottom: theme.metrics.spacingV.p20,
  },
  subtitle: {
    maxWidth: '90%',
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  optionCard: {
    flex: 1,
    minHeight: hs(176),
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p16,
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  optionIconWrap: {
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  optionCopy: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p4,
  },
  optionDescription: {
    maxWidth: theme.metrics.spacing.p96,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.metrics.spacingV.p24,
  },
}));

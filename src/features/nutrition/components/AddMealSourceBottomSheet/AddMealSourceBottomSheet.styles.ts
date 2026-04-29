import { StyleSheet } from 'react-native-unistyles';
import { hs, vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors.background.surface,
    borderTopLeftRadius: theme.metrics.spacing.p28,
    borderTopRightRadius: theme.metrics.spacing.p28,
  },
  sheetHandle: {
    width: theme.metrics.spacing.p52,
    height: vs(5),
    backgroundColor: theme.colors.border.default,
  },
  scrollContent: {
    paddingBottom: theme.metrics.spacingV.p32,
  },
  sheetContent: {},
  header: {
    minHeight: vs(56),
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
    marginBottom: theme.metrics.spacingV.p12,
  },
  headerCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  subtitle: {
    lineHeight: theme.fonts.size.lg,
  },
  sparkleGroup: {
    width: theme.metrics.spacing.p64,
    minHeight: theme.metrics.spacing.p48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: theme.metrics.spacingV.p8,
  },
  optionList: {
    gap: theme.metrics.spacingV.p8,
  },
  optionCard: {
    minHeight: vs(86),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.xl,
    borderWidth: 1,
  },
  optionManual: {
    backgroundColor: theme.colors.state.successBg,
    borderColor: theme.colors.state.successBg,
  },
  optionPhoto: {
    backgroundColor: theme.colors.state.infoBg,
    borderColor: theme.colors.border.default,
  },
  optionLibrary: {
    backgroundColor: theme.colors.background.section,
    borderColor: theme.colors.border.default,
  },
  optionBarcode: {
    backgroundColor: theme.colors.state.warningBg,
    borderColor: theme.colors.state.warningBg,
  },
  optionIconWrap: {
    width: hs(56),
    height: hs(56),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  optionCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  optionDescription: {
    lineHeight: theme.fonts.size.md,
  },
  chevronWrap: {
    width: theme.metrics.spacing.p28,
    alignItems: 'flex-end',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p16,
    marginTop: theme.metrics.spacingV.p16,
    marginBottom: theme.metrics.spacingV.p8,
  },
  viewAllButton: {
    minHeight: theme.metrics.spacing.p32,
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: theme.metrics.spacing.p4,
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p4,
  },
  recentList: {
    gap: theme.metrics.spacing.p8,
    paddingRight: theme.metrics.spacing.p20,
  },
  recentListFooter: {
    width: hs(44),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.metrics.spacing.p8,
  },
  recentLoadingState: {
    minHeight: vs(84),
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentChip: {
    width: hs(132),
    minHeight: vs(58),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    padding: theme.metrics.spacing.p8,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
  },
  recentThumb: {
    width: hs(42),
    height: hs(42),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  recentImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  recentCopy: {
    flex: 1,
  },
  recentEmptyState: {
    minHeight: vs(84),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.section,
  },
  recentEmptyIcon: {
    width: hs(40),
    height: hs(40),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
  },
  recentEmptyCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.metrics.spacingV.p24,
  },
}));

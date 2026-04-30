import { StyleSheet } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

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
    flexGrow: 1,
    paddingBottom: theme.metrics.spacingV.p32,
  },
  scrollView: {
    flex: 1,
  },
  sheetContent: {
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
  switchCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p16,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.section,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  switchCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  switchActions: {
    alignItems: 'flex-end',
    gap: theme.metrics.spacingV.p8,
  },
  recentViewMoreButton: {
    alignSelf: 'flex-end',
  },
  sectionBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  resultsHeader: {
    minHeight: theme.metrics.spacing.p56,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p16,
  },
  resultsHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  chipWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: theme.metrics.spacing.p8,
  },
  suggestionList: {
    gap: theme.metrics.spacingV.p12,
  },
  suggestionCard: {
    gap: theme.metrics.spacingV.p12,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  suggestionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: theme.metrics.spacing.p12,
  },
  suggestionHeaderCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  suggestionActions: {
    flexDirection: 'row' as const,
    gap: theme.metrics.spacing.p8,
    justifyContent: 'flex-end' as const,
  },
  emptySuggestionCard: {
    gap: theme.metrics.spacingV.p4,
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: theme.metrics.spacing.p12,
    justifyContent: 'flex-end' as const,
  },
  actionsSpacer: {
    flex: 1,
  },
}));

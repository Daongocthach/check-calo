import { StyleSheet } from 'react-native-unistyles';

export const DAY_ITEM_WIDTH = 64;

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    textAlign: 'center',
  },
  monthTitleWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  spacer: {
    width: theme.metrics.iconSize.lg,
  },
  listContent: {
    paddingRight: theme.metrics.spacing.p12,
  },
  dayItem: {
    width: DAY_ITEM_WIDTH,
    alignItems: 'center',
    gap: 0,
  },
  dayItemDisabled: {
    opacity: 0.3,
  },
  dayName: {
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
  },
  dayNameFailed: {
    color: theme.colors.state.error,
  },
  dayNumberWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayNumberWrapSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  dayNumberWrapFailed: {
    backgroundColor: theme.colors.state.errorBg,
    borderColor: theme.colors.state.error,
  },
  dayNumberText: {
    color: theme.colors.text.primary,
  },
  dayNumberTextSelected: {
    color: theme.colors.text.primary,
  },
  dayNumberTextFailed: {
    color: theme.colors.state.error,
  },
  statusWrap: {
    height: theme.metrics.spacing.p20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -theme.metrics.spacingV.p8,
    zIndex: 1,
  },
  crownIcon: {
    width: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
  },
}));

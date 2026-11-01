import { StyleSheet } from 'react-native-unistyles';
import { hs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  wrapper: {
    gap: theme.metrics.spacingV.p4,
    width: '100%',
    minWidth: 0,
    paddingHorizontal: theme.metrics.spacing.p16,
  },
  label: {
    color: theme.colors.text.secondary,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p8,
    marginTop: theme.metrics.spacingV.p16,
  },
  pickerColumn: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  pickerColumnLabel: {
    color: theme.colors.text.secondary,
  },
  pickerInput: {
    position: 'relative',
    overflow: 'hidden',
    height: hs(48),
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.surface,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: hs(120),
    marginTop: -hs(36),
    marginBottom: -hs(36),
  },
  pickerIos: {
    marginTop: hs(4),
  },
  pickerItem: {
    height: hs(120),
    fontSize: theme.fonts.size.md,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
  },
}));

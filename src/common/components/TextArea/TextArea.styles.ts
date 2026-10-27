import { StyleSheet, type UnistylesVariants } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

export const styles = StyleSheet.create((theme) => ({
  textArea: {
    paddingTop: theme.metrics.spacingV.p12,
  },
  minHeight: (numberOfLines: number) => ({
    minHeight: numberOfLines * vs(22),
  }),
  counter: {
    textAlign: 'right' as const,
    color: theme.colors.text.muted,
    marginTop: theme.metrics.spacingV.p4,
  },
}));

export type TextAreaStyleVariants = UnistylesVariants<typeof styles>;

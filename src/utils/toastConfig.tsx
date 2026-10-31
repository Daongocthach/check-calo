import type { StyleProp, ViewStyle } from 'react-native';
import { BaseToast } from 'react-native-toast-message';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { StyleSheet } from 'react-native-unistyles';
import { vs } from '@/theme/metrics';

type ToastProps = ToastConfigParams<unknown>;

/**
 * The library's toasts are a fixed 60pt tall with each line cut to one row, which clips longer
 * messages. These keep the default look but grow with the text so the whole message shows.
 */
function WrappingToast({
  accentStyle,
  ...props
}: ToastProps & { accentStyle: StyleProp<ViewStyle> }) {
  return (
    <BaseToast
      {...props}
      style={[styles.container, accentStyle]}
      contentContainerStyle={styles.content}
      text1NumberOfLines={0}
      text2NumberOfLines={0}
    />
  );
}

export const toastConfig: ToastConfig = {
  success: (props: ToastProps) => <WrappingToast {...props} accentStyle={styles.success} />,
  error: (props: ToastProps) => <WrappingToast {...props} accentStyle={styles.error} />,
  info: (props: ToastProps) => <WrappingToast {...props} accentStyle={styles.info} />,
};

const styles = StyleSheet.create((theme) => ({
  container: {
    height: 'auto',
    minHeight: vs(60),
  },
  content: {
    paddingVertical: vs(10),
  },
  success: {
    borderLeftColor: theme.colors.state.success,
  },
  error: {
    borderLeftColor: theme.colors.state.error,
  },
  info: {
    borderLeftColor: theme.colors.state.info,
  },
}));

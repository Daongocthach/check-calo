import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@/common/components/Text';
import { UniActivityIndicator } from '@/common/components/uni';
import { styles } from './Loading.styles';
import type { LoadingProps } from './Loading.types';

/**
 * Displays a centered activity indicator with an optional text message.
 *
 * @example
 * ```tsx
 * <Loading message="Fetching data..." fullScreen />
 * ```
 */
export function Loading({
  message,
  messageColor = 'secondary',
  fullScreen = false,
  size = 'large',
  accessibilityLabel,
}: LoadingProps) {
  const { t } = useTranslation();

  styles.useVariants({ fullScreen });

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? message ?? t('common.loading')}
    >
      <UniActivityIndicator
        size={size}
        uniProps={(theme) => ({ color: theme.colors.brand.primary })}
      />
      {message && (
        <Text variant="bodySmall" color={messageColor} style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { IconButton } from '@/common/components/IconButton';
import { Text } from '@/common/components/Text';
import type { ScreenHeaderProps } from './ScreenHeader.types';

/**
 * Per-screen header with a round back button, title and an optional right action.
 *
 * @example
 * ```tsx
 * <ScreenHeader title={t('mealDetail.title')} right={<IconButton icon="trash" ... />} />
 * ```
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  safeTop = true,
}: ScreenHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <View style={[styles.container, safeTop && styles.safeTop]}>
      {showBack ? (
        <View style={styles.side}>
          <IconButton
            icon="arrow-back"
            variant="outline"
            onPress={handleBack}
            accessibilityLabel={t('header.back')}
          />
        </View>
      ) : null}
      <View style={styles.titleWrap}>
        <Text variant="h3" weight="bold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p12,
  },
  safeTop: {
    paddingTop: rt.insets.top + theme.metrics.spacingV.p8,
  },
  side: {
    minWidth: theme.metrics.spacing.p40,
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
}));

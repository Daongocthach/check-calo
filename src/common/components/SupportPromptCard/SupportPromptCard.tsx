import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { View, type ColorValue } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Button } from '@/common/components/Button';
import { IconButton } from '@/common/components/IconButton';
import { Text } from '@/common/components/Text';
import CoffeeIcon from '../../../../assets/coffee.png';
import { styles } from './SupportPromptCard.styles';
import type { SupportPromptCardProps } from './SupportPromptCard.types';

export function SupportPromptCard({
  message,
  actionLabel,
  onActionPress,
  onClosePress,
  closeAccessibilityLabel,
  style,
}: SupportPromptCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  let gradientColors: readonly [ColorValue, ColorValue, ...ColorValue[]];

  if (theme.colors.mode === 'dark') {
    gradientColors = [
      theme.colors.brand.primaryVariant,
      theme.colors.state.warning,
      theme.colors.brand.primary,
    ];
  } else {
    gradientColors = [
      theme.colors.state.warning,
      theme.colors.state.warningBg,
      theme.colors.brand.primary,
    ];
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardFrame, style]}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.iconWrap} accessibilityRole="image" accessibilityLabel={message}>
            <Image source={CoffeeIcon} style={styles.icon} contentFit="contain" />
          </View>

          <View style={styles.contentBlock}>
            <View style={styles.headerRow}>
              <View style={styles.messageWrap}>
                <Text variant="bodySmall" color="secondary" align="center" style={styles.message}>
                  {message}
                </Text>
              </View>

              <IconButton
                icon="close"
                variant="ghost"
                size="sm"
                accessibilityLabel={closeAccessibilityLabel ?? t('common.close')}
                onPress={onClosePress}
              />
            </View>

            <Button
              title={actionLabel}
              variant="primary"
              size="sm"
              onPress={onActionPress}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

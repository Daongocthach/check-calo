import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
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

  return (
    <View style={[styles.card, style]}>
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
            fullWidth
            onPress={onActionPress}
            style={styles.actionButton}
          />
        </View>
      </View>
    </View>
  );
}

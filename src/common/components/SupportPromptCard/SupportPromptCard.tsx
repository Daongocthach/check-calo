import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/common/components/Button';
import { Icon } from '@/common/components/Icon';
import { IconButton } from '@/common/components/IconButton';
import { Text } from '@/common/components/Text';
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
        <View style={styles.leftBlock}>
          <View style={styles.iconWrap} accessibilityRole="image" accessibilityLabel={message}>
            <Icon name="cafe-outline" size={28} variant="accent" />
          </View>
          <Text variant="bodySmall" color="secondary" style={styles.message}>
            {message}
          </Text>
        </View>

        {onClosePress ? (
          <IconButton
            icon="close"
            variant="ghost"
            size="sm"
            accessibilityLabel={closeAccessibilityLabel ?? t('common.close')}
            onPress={onClosePress}
          />
        ) : null}
      </View>

      <Button
        title={actionLabel}
        variant="primary"
        fullWidth
        onPress={onActionPress}
        style={styles.actionButton}
      />
    </View>
  );
}

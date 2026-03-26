import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useAuthStore } from '@/providers/auth/authStore';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { styles } from './TabsHeader.styles';
import type { TabsHeaderProps } from './TabsHeader.types';

export function TabsHeader({
  title,
  onBack,
  onSyncPress,
  showSync = true,
  backDisabled = false,
}: TabsHeaderProps) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  let syncIconName: 'cloud-offline-outline' | 'cloud-outline' = 'cloud-outline';
  let syncLabel = t('common.syncStatus.syncNow');
  let syncVariant: 'secondary' | 'muted' = 'secondary';

  if (!isAuthenticated) {
    syncIconName = 'cloud-offline-outline';
    syncLabel = t('common.syncStatus.loginToSync');
    syncVariant = 'muted';
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
        onPress={onBack}
        style={[styles.iconButton, backDisabled ? styles.iconButtonDisabled : null]}
      >
        <Icon name="chevron-back" variant="secondary" size={20} />
      </Pressable>
      <Text variant="h3" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {showSync ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={syncLabel}
          onPress={() => {
            if (onSyncPress) {
              onSyncPress();
            }
          }}
          style={styles.iconButton}
        >
          <Icon name={syncIconName} variant={syncVariant} size={20} />
        </Pressable>
      ) : (
        <View style={styles.iconButtonPlaceholder} />
      )}
    </View>
  );
}

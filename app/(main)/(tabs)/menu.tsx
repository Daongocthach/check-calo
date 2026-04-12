import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Card, Icon, ScreenContainer, Text } from '@/common/components';

export default function MenuTab() {
  const { t } = useTranslation();

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <Card variant="elevated" style={styles.heroCard}>
        <Icon name="restaurant-outline" variant="primary" size={24} />
        <Text variant="h2">{t('menuScreen.title')}</Text>
        <Text variant="bodySmall" color="secondary" align="center">
          {t('menuScreen.subtitle')}
        </Text>
        <Button
          title={t('menuScreen.libraryAction')}
          variant="outline"
          onPress={() => router.push('/favorites')}
        />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  heroCard: {
    gap: theme.metrics.spacingV.p16,
    alignItems: 'center',
    paddingHorizontal: theme.metrics.spacing.p20,
    paddingVertical: theme.metrics.spacingV.p24,
    backgroundColor: theme.colors.background.surface,
  },
}));

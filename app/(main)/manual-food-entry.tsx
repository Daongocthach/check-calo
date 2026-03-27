import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Input, ScreenContainer, Text } from '@/common/components';

export default function ManualFoodEntryScreen() {
  const { t } = useTranslation();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [calories, setCalories] = useState('');

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.headerBlock}>
          <Text variant="h2">{t('manualFoodEntry.title')}</Text>
          <Text variant="bodySmall" color="secondary">
            {t('manualFoodEntry.subtitle')}
          </Text>
        </View>

        <View style={styles.formBlock}>
          <Input
            value={foodName}
            onChangeText={setFoodName}
            accessibilityLabel={t('manualFoodEntry.fields.foodName')}
            placeholder={t('manualFoodEntry.placeholders.foodName')}
          />
          <Input
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            accessibilityLabel={t('manualFoodEntry.fields.quantity')}
            placeholder={t('manualFoodEntry.placeholders.quantity')}
          />
          <Input
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            accessibilityLabel={t('manualFoodEntry.fields.calories')}
            placeholder={t('manualFoodEntry.placeholders.calories')}
          />
        </View>

        <Button
          title={t('common.done')}
          fullWidth
          onPress={() => router.push('/food-result?mode=manual')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  headerBlock: {
    gap: theme.metrics.spacingV.p8,
  },
  formBlock: {
    gap: theme.metrics.spacingV.p12,
  },
}));

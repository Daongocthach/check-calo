import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Card, Icon, Input, ScreenContainer, Text } from '@/common/components';
import { hs, vs } from '@/theme/metrics';

const CALORIE_PRESETS = ['120', '240', '380', '520'];

export default function AddCaloriesTab() {
  const { t } = useTranslation();
  const [calories, setCalories] = useState('380');
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(
    'lunch'
  );

  const mealOptions: Array<{
    key: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    icon: ComponentProps<typeof Icon>['name'];
  }> = [
    { key: 'breakfast', icon: 'sunny-outline' },
    { key: 'lunch', icon: 'restaurant-outline' },
    { key: 'dinner', icon: 'moon-outline' },
    { key: 'snack', icon: 'cafe-outline' },
  ];

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.summaryCard}>
          <Text variant="caption" color="secondary">
            {t('addScreen.todaySummary')}
          </Text>
          <Text variant="h1">1,020</Text>
          <Text variant="bodySmall" color="secondary">
            {t('addScreen.todaySummaryHint')}
          </Text>
        </Card>

        <View style={styles.section}>
          <Text variant="h3">{t('addScreen.chooseMeal')}</Text>
          <View style={styles.mealGrid}>
            {mealOptions.map((meal) => {
              const active = selectedMeal === meal.key;
              return (
                <Pressable
                  key={meal.key}
                  accessibilityRole="button"
                  accessibilityLabel={t(`addScreen.meals.${meal.key}`)}
                  style={[styles.mealOption, active && styles.mealOptionActive]}
                  onPress={() => setSelectedMeal(meal.key)}
                >
                  <View style={[styles.mealIcon, active && styles.mealIconActive]}>
                    <Icon name={meal.icon} variant={active ? 'onBrand' : 'secondary'} size={20} />
                  </View>
                  <Text variant="bodySmall" weight="medium">
                    {t(`addScreen.meals.${meal.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h3">{t('addScreen.caloriesLabel')}</Text>
          <Input
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            placeholder={t('addScreen.caloriesPlaceholder')}
            accessibilityLabel={t('addScreen.caloriesLabel')}
          />
          <View style={styles.presetRow}>
            {CALORIE_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={t('addScreen.quickAdd', { value: preset })}
                style={styles.presetButton}
                onPress={() => setCalories(preset)}
              >
                <Text variant="caption" weight="semibold">
                  +{preset}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Card variant="filled" style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Icon name="sparkles-outline" variant="accent" size={18} />
            <Text variant="h3">{t('addScreen.suggestionTitle')}</Text>
          </View>
          <Text variant="bodySmall" color="secondary">
            {t('addScreen.suggestionBody')}
          </Text>
        </Card>

        <Button
          title={t('addScreen.saveAction')}
          fullWidth
          leftIcon={<Icon name="add" variant="onBrand" size={18} />}
          onPress={() => undefined}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  summaryCard: {
    gap: theme.metrics.spacingV.p8,
    backgroundColor: theme.colors.background.section,
  },
  section: {
    gap: theme.metrics.spacingV.p12,
  },
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
  },
  mealOption: {
    width: '47%',
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    gap: theme.metrics.spacingV.p12,
  },
  mealOptionActive: {
    backgroundColor: theme.colors.background.section,
    borderColor: theme.colors.brand.primary,
  },
  mealIcon: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  mealIconActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  presetButton: {
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
  },
  noteCard: {
    gap: vs(10),
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
}));

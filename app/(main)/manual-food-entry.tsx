import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, Card, Input, ScreenContainer, Text, TextArea } from '@/common/components';
import {
  createFoodEntry,
  createFoodEntryFromFavorite,
  getFoodEntryById,
  listFavoriteFoods,
  updateFoodEntry,
} from '@/features/nutrition/services/nutritionDatabase';
import type { FavoriteFood } from '@/features/nutrition/types';

interface ManualFoodFormState {
  foodName: string;
  quantityLabel: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
}

const DEFAULT_FORM: ManualFoodFormState = {
  foodName: '',
  quantityLabel: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
};

function toRoundedString(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseNumber(value: string) {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export default function ManualFoodEntryScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ entryId?: string }>();
  const [form, setForm] = useState<ManualFoodFormState>(DEFAULT_FORM);
  const [favoriteFoods, setFavoriteFoods] = useState<FavoriteFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = useMemo(
    () => typeof params.entryId === 'string' && params.entryId.length > 0,
    [params.entryId]
  );

  const loadScreenData = useCallback(async () => {
    setIsLoading(true);
    const favorites = await listFavoriteFoods();
    setFavoriteFoods(favorites);

    if (isEditing && typeof params.entryId === 'string') {
      const entry = await getFoodEntryById(params.entryId);

      if (entry) {
        setForm({
          foodName: entry.mealName,
          quantityLabel: entry.quantityLabel,
          calories: toRoundedString(entry.totalCalories),
          protein: toRoundedString(entry.proteinGrams),
          carbs: toRoundedString(entry.carbsGrams),
          fat: toRoundedString(entry.fatGrams),
          notes: entry.notes ?? '',
        });
      }
    } else {
      setForm(DEFAULT_FORM);
    }

    setIsLoading(false);
  }, [isEditing, params.entryId]);

  useFocusEffect(
    useCallback(() => {
      void loadScreenData();
    }, [loadScreenData])
  );

  const setField = (field: keyof ManualFoodFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyFavorite = async (favorite: FavoriteFood) => {
    setForm({
      foodName: favorite.name,
      quantityLabel: favorite.quantityLabel,
      calories: toRoundedString(favorite.totalCalories),
      protein: toRoundedString(favorite.proteinGrams),
      carbs: toRoundedString(favorite.carbsGrams),
      fat: toRoundedString(favorite.fatGrams),
      notes: favorite.notes ?? '',
    });
  };

  const handleCreateFromFavorite = async (favoriteId: string) => {
    setIsSaving(true);
    const entry = await createFoodEntryFromFavorite(favoriteId);
    setIsSaving(false);

    router.replace({
      pathname: '/food-result',
      params: {
        mode: 'manual',
        entryId: entry.id,
      },
    });
  };

  const handleSubmit = async () => {
    if (!form.foodName.trim() || !form.quantityLabel.trim() || !form.calories.trim()) {
      return;
    }

    setIsSaving(true);

    const payload = {
      mealName: form.foodName.trim(),
      quantityLabel: form.quantityLabel.trim(),
      totalCalories: parseNumber(form.calories),
      proteinGrams: parseNumber(form.protein),
      carbsGrams: parseNumber(form.carbs),
      fatGrams: parseNumber(form.fat),
      notes: form.notes.trim() ? form.notes.trim() : null,
    };

    const entry =
      isEditing && typeof params.entryId === 'string'
        ? await updateFoodEntry(params.entryId, payload)
        : await createFoodEntry(payload);

    setIsSaving(false);

    if (!entry) {
      return;
    }

    router.replace({
      pathname: '/food-result',
      params: {
        mode: 'manual',
        entryId: entry.id,
      },
    });
  };

  if (isLoading) {
    return (
      <ScreenContainer padded edges={['bottom']}>
        <Text>{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable padded edges={['bottom']}>
      <View style={styles.screen}>
        <View style={styles.headerBlock}>
          <Text variant="h2">
            {isEditing ? t('manualFoodEntry.editTitle') : t('manualFoodEntry.title')}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {t('manualFoodEntry.subtitle')}
          </Text>
        </View>

        {favoriteFoods.length > 0 ? (
          <Card variant="filled" style={styles.favoriteCard}>
            <Text variant="body" weight="semibold">
              {t('manualFoodEntry.favoriteSectionTitle')}
            </Text>
            <View style={styles.favoriteChipWrap}>
              {favoriteFoods.map((favorite) => (
                <Pressable
                  key={favorite.id}
                  accessibilityRole="button"
                  accessibilityLabel={favorite.name}
                  style={styles.favoriteChip}
                  onPress={() => {
                    void applyFavorite(favorite);
                  }}
                  onLongPress={() => {
                    void handleCreateFromFavorite(favorite.id);
                  }}
                >
                  <Text variant="caption" weight="semibold">
                    {favorite.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {`${Math.round(favorite.totalCalories)} ${t('common.units.kcal')}`}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text variant="caption" color="secondary">
              {t('manualFoodEntry.favoriteSectionHint')}
            </Text>
          </Card>
        ) : null}

        <View style={styles.formBlock}>
          <Input
            label={t('manualFoodEntry.fields.foodName')}
            value={form.foodName}
            onChangeText={(value) => setField('foodName', value)}
            accessibilityLabel={t('manualFoodEntry.fields.foodName')}
            placeholder={t('manualFoodEntry.placeholders.foodName')}
          />
          <Input
            label={t('manualFoodEntry.fields.quantity')}
            value={form.quantityLabel}
            onChangeText={(value) => setField('quantityLabel', value)}
            accessibilityLabel={t('manualFoodEntry.fields.quantity')}
            placeholder={t('manualFoodEntry.placeholders.quantity')}
          />
          <Input
            label={t('manualFoodEntry.fields.calories')}
            value={form.calories}
            onChangeText={(value) => setField('calories', value)}
            keyboardType="decimal-pad"
            accessibilityLabel={t('manualFoodEntry.fields.calories')}
            placeholder={t('manualFoodEntry.placeholders.calories')}
          />

          <View style={styles.macroGrid}>
            <Input
              label={t('manualFoodEntry.fields.protein')}
              value={form.protein}
              onChangeText={(value) => setField('protein', value)}
              keyboardType="decimal-pad"
              placeholder={t('manualFoodEntry.placeholders.macro')}
            />
            <Input
              label={t('manualFoodEntry.fields.carbs')}
              value={form.carbs}
              onChangeText={(value) => setField('carbs', value)}
              keyboardType="decimal-pad"
              placeholder={t('manualFoodEntry.placeholders.macro')}
            />
            <Input
              label={t('manualFoodEntry.fields.fat')}
              value={form.fat}
              onChangeText={(value) => setField('fat', value)}
              keyboardType="decimal-pad"
              placeholder={t('manualFoodEntry.placeholders.macro')}
            />
          </View>

          <TextArea
            label={t('manualFoodEntry.fields.notes')}
            value={form.notes}
            onChangeText={(value) => setField('notes', value)}
            placeholder={t('manualFoodEntry.placeholders.notes')}
            numberOfLines={4}
          />
        </View>

        <Button
          title={isEditing ? t('manualFoodEntry.updateAction') : t('manualFoodEntry.saveAction')}
          fullWidth
          loading={isSaving}
          onPress={() => {
            void handleSubmit();
          }}
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
  favoriteCard: {
    gap: theme.metrics.spacingV.p12,
  },
  favoriteChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  favoriteChip: {
    gap: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
  },
  formBlock: {
    gap: theme.metrics.spacingV.p12,
  },
  macroGrid: {
    gap: theme.metrics.spacingV.p12,
  },
}));

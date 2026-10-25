import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, FormField, Input, TextArea } from '@/common/components';
import {
  foodEntryFormSchema,
  parseFormNumber,
  type FoodEntryFormValues,
} from '../../schemas/foodEntrySchema';
import type { FoodEntry, FoodEntryInput } from '../../types';

export interface MealEditFormProps {
  entry: FoodEntry;
  onCancel: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

export function MealEditForm({ entry, onCancel, onSubmit }: MealEditFormProps) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntryFormSchema),
    defaultValues: {
      name: entry.mealName,
      quantityLabel: entry.quantityLabel,
      calories: String(Math.round(entry.totalCalories)),
      proteinGrams: String(Math.round(entry.proteinGrams)),
      carbsGrams: String(Math.round(entry.carbsGrams)),
      fatGrams: String(Math.round(entry.fatGrams)),
      notes: entry.notes ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      mealName: values.name.trim(),
      quantityLabel: values.quantityLabel.trim(),
      quantityGrams: entry.quantityGrams ?? null,
      totalCalories: parseFormNumber(values.calories),
      proteinGrams: parseFormNumber(values.proteinGrams),
      carbsGrams: parseFormNumber(values.carbsGrams),
      fatGrams: parseFormNumber(values.fatGrams),
      notes: values.notes.trim() || null,
      barcode: entry.barcode ?? null,
      imageUri: entry.imageUri ?? null,
      thumbnailUri: entry.thumbnailUri ?? null,
      consumedAt: entry.consumedAt,
      entryDate: entry.entryDate,
    });
  });

  const numberFields = [
    { name: 'calories', label: t('mealDetail.fields.calories') },
    { name: 'proteinGrams', label: t('mealDetail.fields.protein') },
    { name: 'carbsGrams', label: t('mealDetail.fields.carbs') },
    { name: 'fatGrams', label: t('mealDetail.fields.fat') },
  ] as const;

  return (
    <View style={styles.container}>
      <FormField control={control} name="name" label={t('mealDetail.fields.name')} required>
        <Input />
      </FormField>
      <FormField control={control} name="quantityLabel" label={t('mealDetail.fields.quantity')}>
        <Input />
      </FormField>
      <View style={styles.grid}>
        {numberFields.map((field) => (
          <View key={field.name} style={styles.gridItem}>
            <FormField control={control} name={field.name} label={field.label} required>
              <Input keyboardType="decimal-pad" />
            </FormField>
          </View>
        ))}
      </View>
      <FormField control={control} name="notes" label={t('mealDetail.fields.notes')}>
        <TextArea />
      </FormField>
      <View style={styles.actions}>
        <Button
          title={t('common.cancel')}
          variant="outline"
          onPress={onCancel}
          style={styles.flex}
        />
        <Button
          title={t('common.save')}
          loading={isSubmitting}
          onPress={() => {
            void submit();
          }}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.metrics.spacingV.p12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  flex: {
    flex: 1,
  },
}));

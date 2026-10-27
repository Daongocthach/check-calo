import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, FormField, Input, Text, TextArea } from '@/common/components';
import { NUTRIENT_UNIT_KEYS, NUTRIENTS } from '../../constants';
import {
  foodEntryFormSchema,
  parseFormNumber,
  parseOptionalFormNumber,
  type FoodEntryFormValues,
} from '../../schemas/foodEntrySchema';
import type { FoodEntry, FoodEntryInput, NutrientKey } from '../../types';
import { formatNutrientAmount } from '../../utils/format';
import { pickNutrients } from '../../utils/nutrients';

export interface MealEditFormProps {
  entry: FoodEntry;
  onCancel: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

type NutrientFormValues = Pick<FoodEntryFormValues, NutrientKey>;

function toNutrientFormValues(entry: FoodEntry) {
  const values: Partial<NutrientFormValues> = {};

  for (const nutrient of NUTRIENTS) {
    const value = entry[nutrient.key];
    values[nutrient.key] = value === null ? '' : formatNutrientAmount(value, nutrient.unit);
  }

  return values;
}

function parseNutrientFormValues(values: NutrientFormValues) {
  const parsed: Partial<Record<NutrientKey, number | null>> = {};

  for (const nutrient of NUTRIENTS) {
    parsed[nutrient.key] = parseOptionalFormNumber(values[nutrient.key]);
  }

  return pickNutrients(parsed);
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
      ...toNutrientFormValues(entry),
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
      ...parseNutrientFormValues(values),
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
      <Text variant="body" weight="bold">
        {t('nutrients.title')}
      </Text>
      <View style={styles.grid}>
        {NUTRIENTS.map((nutrient) => (
          <View key={nutrient.key} style={styles.gridItem}>
            <FormField
              control={control}
              name={nutrient.key}
              label={`${t(`nutrients.${nutrient.key}`)} (${t(NUTRIENT_UNIT_KEYS[nutrient.unit])})`}
            >
              <Input keyboardType="decimal-pad" placeholder={t('nutrients.unknown')} />
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

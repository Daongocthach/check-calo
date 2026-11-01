import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Button, FormField, IconButton, Input, Text, TextArea } from '@/common/components';
import { NUTRIENT_UNIT_KEYS, NUTRIENTS } from '../../constants';
import {
  foodEntryFormSchema,
  parseFormNumber,
  parseOptionalFormNumber,
  type FoodEntryFormValues,
} from '../../schemas/foodEntrySchema';
import type { NutrientKey, NutrientValues } from '../../types';
import { formatNutrientAmount } from '../../utils/format';
import { pickNutrients } from '../../utils/nutrients';

/** What the form edits: a diary entry, or a food Check AI found before it is saved. */
export interface MealEditValues extends NutrientValues {
  name: string;
  quantityLabel: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes: string | null;
}

export interface MealEditFormProps {
  values: MealEditValues;
  /** Chat foods have no notes yet, so the field is hidden there. Defaults to `true`. */
  showNotes?: boolean;
  /** Renders a remove button next to cancel and save. */
  onRemove?: () => void;
  onCancel: () => void;
  onSubmit: (values: MealEditValues) => Promise<void> | void;
}

type NutrientFormValues = Pick<FoodEntryFormValues, NutrientKey>;

function toNutrientFormValues(source: NutrientValues, language: string) {
  const values: Partial<NutrientFormValues> = {};

  for (const nutrient of NUTRIENTS) {
    const value = source[nutrient.key];
    values[nutrient.key] =
      value === null
        ? ''
        : formatNutrientAmount(value, nutrient.unit, language, { grouping: false });
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

export function MealEditForm({
  values: initialValues,
  showNotes = true,
  onRemove,
  onCancel,
  onSubmit,
}: MealEditFormProps) {
  const { t, i18n } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntryFormSchema),
    defaultValues: {
      name: initialValues.name,
      quantityLabel: initialValues.quantityLabel,
      calories: String(Math.round(initialValues.calories)),
      proteinGrams: String(Math.round(initialValues.proteinGrams)),
      carbsGrams: String(Math.round(initialValues.carbsGrams)),
      fatGrams: String(Math.round(initialValues.fatGrams)),
      ...toNutrientFormValues(initialValues, i18n.language),
      notes: initialValues.notes ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name.trim(),
      quantityLabel: values.quantityLabel.trim(),
      calories: parseFormNumber(values.calories),
      proteinGrams: parseFormNumber(values.proteinGrams),
      carbsGrams: parseFormNumber(values.carbsGrams),
      fatGrams: parseFormNumber(values.fatGrams),
      ...parseNutrientFormValues(values),
      notes: values.notes.trim() || null,
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
      {showNotes ? (
        <FormField control={control} name="notes" label={t('mealDetail.fields.notes')}>
          <TextArea />
        </FormField>
      ) : null}
      <View style={styles.actions}>
        {onRemove ? (
          <IconButton
            icon="trash-outline"
            variant="outline"
            onPress={onRemove}
            accessibilityLabel={t('chat.removeFood')}
          />
        ) : null}
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

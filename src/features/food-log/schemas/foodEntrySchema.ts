import { z } from 'zod';

const numberField = z
  .string()
  .trim()
  .min(1, 'validation.required')
  .refine(
    (value) =>
      Number.isFinite(Number(value.replace(',', '.'))) && Number(value.replace(',', '.')) >= 0,
    {
      message: 'validation.numberInvalid',
    }
  );

export const foodEntryFormSchema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  quantityLabel: z.string().trim(),
  calories: numberField,
  proteinGrams: numberField,
  carbsGrams: numberField,
  fatGrams: numberField,
  notes: z.string(),
});

export type FoodEntryFormValues = z.infer<typeof foodEntryFormSchema>;

export function parseFormNumber(value: string) {
  return Math.round(Number(value.replace(',', '.')));
}

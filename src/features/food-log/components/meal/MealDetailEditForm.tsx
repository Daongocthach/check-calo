import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTimeField } from '@/common/components';
import type { FoodEntry, FoodEntryInput } from '@/features/food-log/types';
import { toast } from '@/utils/toast';
import { MealEditForm } from './MealEditForm';

interface MealDetailEditFormProps {
  entry: FoodEntry;
  onCancel: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

export function MealDetailEditForm({ entry, onCancel, onSubmit }: MealDetailEditFormProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(entry.entryDate);
  const consumed = new Date(entry.consumedAt);
  const originalTime = `${String(consumed.getHours()).padStart(2, '0')}:${String(consumed.getMinutes()).padStart(2, '0')}`;
  const [time, setTime] = useState(originalTime);

  return (
    <>
      <DateTimeField label={t('common.date')} value={date} onChange={setDate} mode="date" />
      <DateTimeField label={t('common.time')} value={time} onChange={setTime} mode="time" />
      <MealEditForm
        values={{ ...entry, name: entry.mealName, calories: entry.totalCalories }}
        onCancel={onCancel}
        onSubmit={async ({ name, calories, ...values }) => {
          try {
            await onSubmit({
              ...values,
              mealName: name,
              totalCalories: calories,
              quantityGrams: entry.quantityGrams ?? null,
              barcode: entry.barcode ?? null,
              imageUri: entry.imageUri ?? null,
              thumbnailUri: entry.thumbnailUri ?? null,
              consumedAt:
                date === entry.entryDate && time === originalTime
                  ? entry.consumedAt
                  : new Date(`${date}T${time}:00`).toISOString(),
              entryDate: date,
            });
          } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('errors.generic'));
          }
        }}
      />
    </>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTimeField } from '@/common/components';
import type { FoodEntry, FoodEntryInput } from '@/features/food-log/types';
import { formatDateKey } from '@/utils/date';
import { toast } from '@/utils/toast';
import { MealEditForm } from './MealEditForm';

interface MealDetailEditFormProps {
  entry: FoodEntry;
  onCancel: () => void;
  onSubmit: (input: FoodEntryInput) => Promise<void>;
}

function formatClock(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function MealDetailEditForm({ entry, onCancel, onSubmit }: MealDetailEditFormProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(entry.entryDate);
  const originalTime = formatClock(new Date(entry.consumedAt));
  const [time, setTime] = useState(originalTime);
  const [isSaving, setIsSaving] = useState(false);

  // A meal can't be eaten later than now, so today caps the time at the current minute.
  const now = new Date();
  const isToday = date === formatDateKey(now);

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    const currentTime = formatClock(new Date());
    if (nextDate === formatDateKey(new Date()) && time > currentTime) {
      setTime(currentTime);
    }
  };

  return (
    <>
      <DateTimeField
        label={t('common.date')}
        value={date}
        onChange={changeDate}
        mode="date"
        maximumDate={now}
        disabled={isSaving}
      />
      <DateTimeField
        label={t('common.time')}
        value={time}
        onChange={setTime}
        mode="time"
        maximumDate={isToday ? now : undefined}
        disabled={isSaving}
      />
      <MealEditForm
        values={{ ...entry, name: entry.mealName, calories: entry.totalCalories }}
        onCancel={onCancel}
        onSubmit={async ({ name, calories, ...values }) => {
          setIsSaving(true);
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
          } finally {
            setIsSaving(false);
          }
        }}
      />
    </>
  );
}

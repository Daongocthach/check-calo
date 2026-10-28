import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input } from '@/common/components';
import { useFoodEntryRefreshStore } from '@/features/food-log/stores/useFoodEntryRefreshStore';
import { toast } from '@/utils/toast';
import { logWeight, parseWeightInput } from '../../services/weightLogService';

interface WeighInDialogProps {
  visible: boolean;
  onDismiss: () => void;
  /** Prefills the field, e.g. with the latest weight. */
  initialWeightKg?: number | null;
}

/** Asks for today's weight and saves it as the day's weigh-in. */
export function WeighInDialog({ visible, onDismiss, initialWeightKg }: WeighInDialogProps) {
  const { t } = useTranslation();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(initialWeightKg ? String(initialWeightKg) : '');
      setError(undefined);
    }
  }, [visible, initialWeightKg]);

  const save = async () => {
    const weightKg = parseWeightInput(draft);

    if (weightKg === null) {
      setError(t('goalTracking.weighIn.invalid'));
      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await logWeight(weightKg);
      markFoodEntriesChanged();
      toast.success(t('goalTracking.weighIn.saved'));
      onDismiss();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={t('goalTracking.weighIn.title')}
      message={t('goalTracking.weighIn.message')}
      size="sm"
      keyboardAware
      actions={[
        { label: t('common.cancel'), onPress: onDismiss, variant: 'ghost' },
        {
          label: t('common.save'),
          onPress: () => {
            void save();
          },
          variant: 'primary',
        },
      ]}
    >
      <Input
        value={draft}
        onChangeText={(value) => {
          setDraft(value);
          setError(undefined);
        }}
        placeholder={t('goalTracking.weighIn.placeholder')}
        keyboardType="decimal-pad"
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => {
          void save();
        }}
      />
    </Dialog>
  );
}

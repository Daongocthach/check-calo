import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { FormField, Icon, Input, Text } from '@/common/components';
import type { InputProps } from '@/common/components/Input/Input.types';
import type { GoalDraft } from '@/features/goals/utils/goalPlan';
import { GENDER_KEYS, OFFERED_ACTIVITY_KEYS, toOfferedActivity } from '../../constants';
import type { ProfileFormValues } from '../../schemas/profileSchema';
import { styles } from './AboutStep.styles';
import { RadioChoiceGroup } from './RadioChoice';

interface AboutStepProps {
  control: Control<ProfileFormValues>;
  goalMode: GoalDraft['mode'];
  /** The target weights the chosen goal allows. */
  targetBounds: { min: number; max: number };
  /** Applies a goal change and keeps the target and duration valid for it. */
  onGoalChange: (change: Partial<GoalDraft>) => void;
}

const GOAL_MODES = ['lose', 'maintain', 'gain'] as const;

interface StepInputProps extends InputProps {
  min: number;
  max: number;
  unit?: string;
}

function StepInput({ min, max, unit, value, onChangeText, ...props }: StepInputProps) {
  const { t } = useTranslation();
  const numericValue = Number(value);
  const change = (delta: number) => {
    const current = Number.isFinite(numericValue) ? numericValue : min;
    onChangeText?.(String(Math.min(max, Math.max(min, current + delta))));
  };
  return (
    <Input
      {...props}
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      size="sm"
      style={styles.number}
      rightIcon={
        <View style={styles.controls}>
          {unit ? (
            <Text variant="caption" color="secondary">
              {unit}
            </Text>
          ) : null}
          {([-1, 1] as const).map((delta) => {
            const disabled = delta < 0 ? numericValue <= min : numericValue >= max;
            return (
              <Pressable
                key={delta}
                accessibilityRole="button"
                accessibilityLabel={`${t(delta < 0 ? 'common.decreaseQuantity' : 'common.increaseQuantity')}: ${props.label ?? ''}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => change(delta)}
                style={[styles.stepButton, disabled && styles.disabled]}
              >
                <Icon name={delta < 0 ? 'remove' : 'add'} variant="brand" size={20} />
              </Pressable>
            );
          })}
        </View>
      }
    />
  );
}

/** A whole-number field whose value lives in the form as a number. */
function NumberStepInput({
  value,
  onChange,
  ...props
}: Omit<StepInputProps, 'value' | 'onChangeText' | 'maxLength'> & {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <StepInput
      {...props}
      maxLength={3}
      value={String(value)}
      onChangeText={(text) => {
        const next = Number(text);
        if (Number.isFinite(next)) onChange(next);
      }}
    />
  );
}

export function AboutStep({ control, goalMode, targetBounds, onGoalChange }: AboutStepProps) {
  const { t } = useTranslation();
  const blurAndApplyGoal = (onBlur: () => void) => () => {
    onBlur();
    onGoalChange({});
  };

  return (
    <View style={styles.form}>
      <View style={styles.fieldGroup}>
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <Input
              label={`${t('onboarding.displayName')} *`}
              placeholder={t('onboarding.displayNamePlaceholder')}
              autoCapitalize="words"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={
                fieldState.error?.message
                  ? t(fieldState.error.message, { defaultValue: t('validation.required') })
                  : undefined
              }
              rightIcon={
                field.value ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('common.clear')}: ${t('onboarding.displayName')}`}
                    onPress={() => field.onChange('')}
                  >
                    <Icon name="close-circle" variant="muted" size={20} />
                  </Pressable>
                ) : undefined
              }
            />
          )}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text variant="label">{t('onboarding.gender')}</Text>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <RadioChoiceGroup
              options={GENDER_KEYS.map((gender) => ({
                value: gender,
                label: t(`onboarding.genders.${gender}`),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.fieldGroup}>
          <FormField control={control} name="age" label={t('onboarding.age')} required>
            <StepInput min={10} max={100} maxLength={3} />
          </FormField>
        </View>
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="heightCm"
            render={({ field }) => (
              <NumberStepInput
                label={t('onboarding.height')}
                unit={t('common.units.cm')}
                min={120}
                max={220}
                value={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      </View>
      <View style={styles.fieldGroup}>
        <Text variant="label">{t('onboarding.activity')}</Text>
        <Controller
          control={control}
          name="activityLevel"
          render={({ field }) => (
            <RadioChoiceGroup
              wrap
              options={OFFERED_ACTIVITY_KEYS.map((level) => ({
                value: level,
                label: t(`onboarding.activities.${level}`),
              }))}
              value={toOfferedActivity(field.value)}
              onChange={field.onChange}
            />
          )}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text variant="label">{t('onboarding.goal')}</Text>
        <Controller
          control={control}
          name="goalMode"
          render={({ field }) => (
            <RadioChoiceGroup
              options={GOAL_MODES.map((mode) => ({
                value: mode,
                label: t(`onboarding.goals.${mode}.title`),
              }))}
              value={field.value}
              onChange={(mode) => onGoalChange({ mode })}
            />
          )}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="weightKg"
            render={({ field }) => (
              <NumberStepInput
                label={t('onboarding.weight')}
                unit={t('common.units.kg')}
                min={30}
                max={160}
                value={field.value}
                onBlur={blurAndApplyGoal(field.onBlur)}
                onChange={field.onChange}
              />
            )}
          />
        </View>
        {goalMode === 'maintain' ? null : (
          <View style={styles.fieldGroup}>
            <Controller
              control={control}
              name="targetWeightKg"
              render={({ field }) => (
                <NumberStepInput
                  label={t('onboarding.targetWeight')}
                  unit={t('common.units.kg')}
                  min={targetBounds.min}
                  max={targetBounds.max}
                  value={field.value}
                  onBlur={blurAndApplyGoal(field.onBlur)}
                  onChange={field.onChange}
                />
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Button } from '@/common/components/Button';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { styles } from './DateTimeField.styles';
import type {
  DateTimeFieldHandle,
  DateTimeFieldMode,
  DateTimeFieldProps,
} from './DateTimeField.types';

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function mergeTime(baseDate: Date, timeDate: Date) {
  const nextDate = new Date(baseDate);
  nextDate.setHours(
    timeDate.getHours(),
    timeDate.getMinutes(),
    timeDate.getSeconds(),
    timeDate.getMilliseconds()
  );
  return nextDate;
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function formatTime(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatDateTime(value: Date) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

function formatByMode(value: Date, mode: DateTimeFieldMode) {
  if (mode === 'time') {
    return formatTime(value);
  }

  if (mode === 'datetime') {
    return formatDateTime(value);
  }

  return formatDate(value);
}

function parseValue(value: string, mode: DateTimeFieldMode) {
  if (!value.trim()) {
    return new Date();
  }

  if (mode === 'time') {
    const [hour, minute] = value.split(':').map(Number);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return new Date();
    }

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  }

  if (mode === 'datetime') {
    const [datePart = '', timePart = ''] = value.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return new Date();
    }

    return new Date(year, month - 1, day, hour, minute);
  }

  const [year, month, day] = value.split('-').map(Number);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export const DateTimeField = forwardRef<DateTimeFieldHandle, DateTimeFieldProps>(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      mode = 'date',
      title,
      error,
      disabled = false,
      readOnly = false,
      locale,
      minimumDate,
      maximumDate,
      hideTrigger = false,
    }: DateTimeFieldProps,
    ref
  ) => {
    const { t, i18n } = useTranslation();
    const { theme } = useUnistyles();
    const { openSheet, closeSheet } = useAppBottomSheet();
    const resolvedLocale = locale ?? i18n.language;
    const isInteractionDisabled = disabled || readOnly;
    const pickerValue = useMemo(() => parseValue(value, mode), [mode, value]);
    const [draftValue, setDraftValue] = useState(pickerValue);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const snapPoints = useMemo(() => {
      if (mode === 'time') {
        return ['60%'];
      }

      if (mode === 'datetime') {
        return ['60%'];
      }

      return ['60%'];
    }, [mode]);

    const commitValue = useCallback(
      (nextDate: Date) => {
        onChange(formatByMode(nextDate, mode));
      },
      [mode, onChange]
    );

    const normalizeValue = useCallback(
      (nextDate: Date) => {
        if (mode === 'date') {
          return startOfDay(nextDate);
        }

        if (mode === 'time') {
          return mergeTime(pickerValue, nextDate);
        }

        return nextDate;
      },
      [mode, pickerValue]
    );

    const handleOpen = useCallback(() => {
      if (isInteractionDisabled) {
        return;
      }

      setDraftValue(pickerValue);
      setIsSheetOpen(true);
    }, [isInteractionDisabled, pickerValue]);

    const handleDismiss = useCallback(() => {
      setIsSheetOpen(false);
    }, []);

    const closePicker = useCallback(() => {
      closeSheet();
    }, [closeSheet]);

    const handleConfirm = useCallback(() => {
      commitValue(normalizeValue(draftValue));
      closePicker();
    }, [closePicker, commitValue, draftValue, normalizeValue]);

    const displayText = value || placeholder || '';
    const modalTitle = title ?? label ?? String(t('common.confirm' as never));
    const pickerTheme = theme.colors.mode === 'dark' ? 'dark' : 'light';

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          if (!isInteractionDisabled) {
            setDraftValue(pickerValue);
            setIsSheetOpen(true);
          }
        },
        dismiss: closePicker,
      }),
      [closePicker, isInteractionDisabled, pickerValue]
    );

    const sheetContent = useMemo(
      () => (
        <View style={styles.sheetContent}>
          <View style={styles.header}>
            <Text variant="body" weight="bold" style={styles.title}>
              {modalTitle}
            </Text>
          </View>

          <View style={styles.pickerSurface}>
            <DatePicker
              style={styles.picker}
              date={draftValue}
              locale={resolvedLocale}
              mode={mode}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onDateChange={setDraftValue}
              theme={pickerTheme}
              dividerColor={theme.colors.border.default}
              buttonColor={theme.colors.brand.primary}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title={String(t('common.cancel' as never))}
              variant="outline"
              size="sm"
              onPress={closePicker}
            />
            <Button
              title={String(t('common.confirm' as never))}
              size="sm"
              onPress={handleConfirm}
            />
          </View>

          <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea} />
        </View>
      ),
      [
        closePicker,
        draftValue,
        handleConfirm,
        maximumDate,
        minimumDate,
        modalTitle,
        mode,
        pickerTheme,
        resolvedLocale,
        t,
        theme.colors.border.default,
        theme.colors.brand.primary,
      ]
    );

    useEffect(() => {
      if (!isSheetOpen) {
        return;
      }

      openSheet(sheetContent, {
        snapPoints,
        containerVariant: 'view',
        enablePanDownToClose: true,
        onDismiss: handleDismiss,
      });
    }, [handleDismiss, isSheetOpen, openSheet, sheetContent, snapPoints]);

    return (
      <View style={styles.wrapper}>
        {!hideTrigger && label ? (
          <Text variant="label" style={styles.label}>
            {label}
          </Text>
        ) : null}

        {!hideTrigger ? (
          <Pressable
            onPress={handleOpen}
            disabled={isInteractionDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isInteractionDisabled }}
            style={({ pressed }) => [
              styles.trigger,
              pressed && !isInteractionDisabled && styles.triggerPressed,
              isInteractionDisabled && styles.triggerDisabled,
              !!error && styles.triggerError,
            ]}
          >
            <Text
              variant="body"
              numberOfLines={1}
              style={value ? styles.valueText : styles.placeholderText}
            >
              {displayText}
            </Text>
            <Icon
              name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
              variant="primary"
              size={20}
            />
          </Pressable>
        ) : null}

        {error ? (
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

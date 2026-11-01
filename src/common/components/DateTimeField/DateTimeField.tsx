import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '@/common/components/Button';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
import { CalendarPicker } from './CalendarPicker';
import { styles } from './DateTimeField.styles';
import type {
  DateTimeFieldHandle,
  DateTimeFieldMode,
  DateTimeFieldProps,
} from './DateTimeField.types';
import { TimePicker } from './TimePicker';

interface DateTimeSheetProps {
  initialValue: Date;
  title: string;
  locale: string;
  mode: DateTimeFieldMode;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (value: Date) => void;
}

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

/** Sheet body that owns the draft value, so scrolling the wheel doesn't re-open the sheet. */
function DateTimeSheet({
  initialValue,
  title,
  locale,
  mode,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: DateTimeSheetProps) {
  const { t } = useTranslation();
  const [draftValue, setDraftValue] = useState(() => {
    if (minimumDate && initialValue < minimumDate) return new Date(minimumDate);
    if (maximumDate && initialValue > maximumDate) return new Date(maximumDate);
    return initialValue;
  });

  return (
    <View style={styles.sheetContent}>
      <View style={styles.header}>
        <Text variant="body" weight="bold" style={styles.title}>
          {title}
        </Text>
      </View>

      <View style={styles.pickerSurface}>
        {mode !== 'time' && (
          <CalendarPicker
            selectedDate={draftValue}
            locale={locale}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onDateSelect={(date) => setDraftValue(mergeTime(date, draftValue))}
          />
        )}
        {mode !== 'date' && (
          <TimePicker
            value={{
              hour: draftValue.getHours(),
              minute: draftValue.getMinutes(),
              second: 0,
            }}
            onChange={({ hour, minute }) => {
              const next = new Date(draftValue);
              next.setHours(hour, minute, 0, 0);
              setDraftValue(next);
            }}
          />
        )}
      </View>

      <View style={styles.actions}>
        <Button title={t('common.cancel')} variant="outline" size="sm" onPress={onCancel} />
        <Button
          title={t('common.confirm')}
          size="sm"
          onPress={() => {
            let next = draftValue;
            if (minimumDate && next < minimumDate) next = minimumDate;
            if (maximumDate && next > maximumDate) next = maximumDate;
            onConfirm(next);
          }}
        />
      </View>
    </View>
  );
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
    const { openSheet, closeSheet } = useAppBottomSheet();
    const resolvedLocale = locale ?? i18n.language;
    const isInteractionDisabled = disabled || readOnly;
    const pickerValue = useMemo(() => parseValue(value, mode), [mode, value]);
    const isSheetOpenRef = useRef(false);
    // The sheet lives outside this component's render, so confirm reads the latest props here.
    const commitRef = useRef<(nextDate: Date) => void>(() => undefined);

    useEffect(() => {
      commitRef.current = (nextDate: Date) => {
        let normalizedDate = nextDate;

        if (mode === 'date') {
          normalizedDate = startOfDay(nextDate);
        } else if (mode === 'time') {
          normalizedDate = mergeTime(pickerValue, nextDate);
        }

        onChange(formatByMode(normalizedDate, mode));
      };
    }, [mode, onChange, pickerValue]);

    // Don't leave a picker open for a screen that is gone.
    useEffect(
      () => () => {
        if (isSheetOpenRef.current) {
          closeSheet();
        }
      },
      [closeSheet]
    );

    const displayText = value || placeholder || '';
    const modalTitle = title ?? label ?? t('common.confirm');

    const openPicker = useCallback(() => {
      if (isInteractionDisabled) {
        return;
      }

      isSheetOpenRef.current = true;
      openSheet(
        <DateTimeSheet
          initialValue={pickerValue}
          title={modalTitle}
          locale={resolvedLocale}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onCancel={closeSheet}
          onConfirm={(nextDate) => {
            commitRef.current(nextDate);
            closeSheet();
          }}
        />,
        {
          containerVariant: 'scroll',
          enablePanDownToClose: true,
          onDismiss: () => {
            isSheetOpenRef.current = false;
          },
        }
      );
    }, [
      closeSheet,
      isInteractionDisabled,
      maximumDate,
      minimumDate,
      modalTitle,
      mode,
      openSheet,
      pickerValue,
      resolvedLocale,
    ]);

    useImperativeHandle(ref, () => ({ present: openPicker, dismiss: closeSheet }), [
      closeSheet,
      openPicker,
    ]);

    return (
      <View style={styles.wrapper}>
        {!hideTrigger && label ? (
          <Text variant="label" style={styles.label}>
            {label}
          </Text>
        ) : null}

        {!hideTrigger ? (
          <Pressable
            onPress={openPicker}
            disabled={isInteractionDisabled}
            accessibilityRole="button"
            accessibilityLabel={modalTitle}
            accessibilityValue={{ text: displayText }}
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

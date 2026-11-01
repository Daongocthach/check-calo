import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { Text } from '@/common/components/Text';
import { styles } from './TimePicker.styles';

interface TimePickerProps {
  value: { hour: number; minute: number; second: number };
  onChange: (time: { hour: number; minute: number; second: number }) => void;
  minuteInterval?: number;
  showSeconds?: boolean;
}

function pad(value: number) {
  return value < 10 ? `0${value}` : `${value}`;
}

interface PickerColumnProps {
  label: string;
  selectedValue: string;
  items: string[];
  onValueChange: (value: string) => void;
}

const PickerColumn = React.memo(
  ({ label, selectedValue, items, onValueChange }: PickerColumnProps) => {
    const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;

    return (
      <View style={styles.pickerColumn}>
        <Text variant="label" style={styles.pickerColumnLabel}>
          {label}
        </Text>
        {Platform.OS === 'android' ? (
          <View style={styles.pickerInput}>
            <Picker
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              selectedValue={selectedValue}
              mode={pickerMode}
              onValueChange={onValueChange}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {items.map((item) => (
                <Picker.Item key={item} label={item} value={item} style={styles.pickerItem} />
              ))}
            </Picker>
          </View>
        ) : (
          <Picker
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            selectedValue={selectedValue}
            mode={pickerMode}
            onValueChange={onValueChange}
            style={[styles.picker, Platform.OS === 'ios' ? styles.pickerIos : null]}
            itemStyle={styles.pickerItem}
          >
            {items.map((item) => (
              <Picker.Item key={item} label={item} value={item} style={styles.pickerItem} />
            ))}
          </Picker>
        )}
      </View>
    );
  }
);

export const TimePicker = React.memo(
  ({ value, onChange, minuteInterval = 1, showSeconds = false }: TimePickerProps) => {
    const { t } = useTranslation();

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
    const minutes = useMemo(
      () =>
        Array.from({ length: Math.ceil(60 / minuteInterval) }, (_, i) => pad(i * minuteInterval)),
      [minuteInterval]
    );
    const seconds = useMemo(() => Array.from({ length: 60 }, (_, i) => pad(i)), []);

    const selectedHour = useMemo(() => pad(value.hour), [value.hour]);
    const selectedMinute = useMemo(
      () =>
        pad(
          Math.min(Math.round(value.minute / minuteInterval), minutes.length - 1) * minuteInterval
        ),
      [minuteInterval, minutes.length, value.minute]
    );
    const selectedSecond = useMemo(() => pad(value.second), [value.second]);

    const handleHourChange = useCallback(
      (h: string) => {
        onChange({
          hour: Number(h),
          minute: Number(selectedMinute),
          second: showSeconds ? value.second : 0,
        });
      },
      [onChange, selectedMinute, showSeconds, value.second]
    );

    const handleMinuteChange = useCallback(
      (m: string) => {
        onChange({ hour: value.hour, minute: Number(m), second: showSeconds ? value.second : 0 });
      },
      [onChange, showSeconds, value.hour, value.second]
    );

    const handleSecondChange = useCallback(
      (s: string) => {
        onChange({ hour: value.hour, minute: value.minute, second: Number(s) });
      },
      [onChange, value.hour, value.minute]
    );

    return (
      <View style={styles.wrapper}>
        <Text variant="label" style={styles.label}>
          {t('common.time')}
        </Text>
        <View style={styles.pickerRow}>
          <PickerColumn
            label={t('dateTimePicker.hours')}
            selectedValue={selectedHour}
            items={hours}
            onValueChange={handleHourChange}
          />
          <PickerColumn
            label={t('dateTimePicker.minutes')}
            selectedValue={selectedMinute}
            items={minutes}
            onValueChange={handleMinuteChange}
          />
          {showSeconds ? (
            <PickerColumn
              label={t('dateTimePicker.seconds')}
              selectedValue={selectedSecond}
              items={seconds}
              onValueChange={handleSecondChange}
            />
          ) : null}
        </View>
      </View>
    );
  }
);

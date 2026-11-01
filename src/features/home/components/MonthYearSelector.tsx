import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { DateTimeField, Icon, Text } from '@/common/components';
import type { DateTimeFieldHandle, IconProps } from '@/common/components';
import { toLocale } from '@/features/food-log/utils/format';
import { formatDateKey } from '@/utils/date';
import { isSameDay } from '../utils/week';

interface MonthYearSelectorProps {
  selectedDate: Date;
  today: Date;
  streak: number;
  onSelect: (date: Date) => void;
}

interface SquareButtonProps {
  icon: IconProps['name'];
  accessibilityLabel: string;
  disabled?: boolean;
  /** Small count in the top-right corner; hidden when 0 or missing. */
  badge?: number;
  onPress: () => void;
}

function SquareButton({
  icon,
  accessibilityLabel,
  disabled = false,
  badge,
  onPress,
}: SquareButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.squareButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} sizeVariant="sm" variant="secondary" />
      {badge ? (
        <View style={styles.badge}>
          <Text variant="caption" weight="bold" color="inverse">
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function MonthYearSelector({
  selectedDate,
  today,
  streak,
  onSelect,
}: MonthYearSelectorProps) {
  const { t, i18n } = useTranslation();
  const pickerRef = useRef<DateTimeFieldHandle>(null);
  const locale = toLocale(i18n.language);
  const monthLabel = selectedDate.toLocaleDateString(locale, { month: 'long' });

  return (
    <View style={styles.header}>
      <Text variant="h3" weight="semibold" numberOfLines={1} style={styles.title}>
        {`${monthLabel} ${selectedDate.getFullYear()}`}
      </Text>
      <SquareButton
        icon="calendar-outline"
        accessibilityLabel={
          streak > 0
            ? `${t('home.pickDate')}, ${t('home.streakLabel', { count: streak })}`
            : t('home.pickDate')
        }
        badge={streak}
        onPress={() => pickerRef.current?.present()}
      />
      <SquareButton
        icon="options-outline"
        accessibilityLabel={t('home.goToToday')}
        disabled={isSameDay(selectedDate, today)}
        onPress={() => onSelect(today)}
      />
      <DateTimeField
        ref={pickerRef}
        hideTrigger
        mode="date"
        title={t('home.pickDate')}
        value={formatDateKey(selectedDate)}
        maximumDate={today}
        onChange={(value) => onSelect(parseDateKey(value))}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  title: {
    flex: 1,
    textTransform: 'capitalize',
  },
  squareButton: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surface,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  badge: {
    position: 'absolute',
    top: -theme.metrics.spacing.p8,
    right: -theme.metrics.spacing.p8,
    alignItems: 'center',
    minWidth: theme.metrics.spacing.p20,
    height: theme.metrics.spacing.p20,
    paddingHorizontal: theme.metrics.spacing.p4,
    borderRadius: theme.metrics.borderRadius.full,
    justifyContent: 'center',
    backgroundColor: theme.colors.icon.accent,
    borderWidth: 1.5,
    borderColor: theme.colors.background.app,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));

import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

export interface WeeklyChallengeDay {
  date: string;
  label: string;
  done: boolean;
  isFuture: boolean;
}

export function WeeklyChallenge({ days }: { days: WeeklyChallengeDay[] }) {
  const { t } = useTranslation();
  const doneCount = days.filter((day) => day.done).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="calendar-outline" variant="brand" size={18} />
        <Text variant="body" weight="bold" style={styles.flex}>
          {t('progress.challengeTitle')}
        </Text>
        <Text variant="bodySmall" color="secondary">
          {t('progress.challengeCount', { done: doneCount, total: days.length })}
        </Text>
      </View>
      <View style={styles.days}>
        {days.map((day) => (
          <View key={day.date} style={styles.day}>
            <Text variant="caption" color="secondary">
              {day.label}
            </Text>
            <View
              style={[
                styles.circle,
                day.done && styles.circleDone,
                day.isFuture && styles.circleFuture,
              ]}
            >
              {day.done ? <Icon name="checkmark" variant="onBrand" size={16} /> : null}
            </View>
          </View>
        ))}
      </View>
      <Text variant="caption" color="tertiary">
        {t('progress.challengeHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    gap: theme.metrics.spacingV.p12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  flex: {
    flex: 1,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  circle: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border.strong,
  },
  circleDone: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary,
  },
  circleFuture: {
    opacity: 0.4,
  },
}));

import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, ScreenContainer, Text } from '@/common/components';
import { hs, vs } from '@/theme/metrics';

interface DayStat {
  day: string;
  minutes: number;
}

export default function StatsTab() {
  const { t } = useTranslation();
  const workoutTrackHeight = vs(112);
  const pointTrackHeight = vs(110);

  const workoutData: DayStat[] = [
    { day: t('statsScreen.days.sat'), minutes: 25 },
    { day: t('statsScreen.days.sun'), minutes: 40 },
    { day: t('statsScreen.days.mon'), minutes: 52 },
    { day: t('statsScreen.days.tue'), minutes: 70 },
    { day: t('statsScreen.days.wed'), minutes: 48 },
    { day: t('statsScreen.days.thu'), minutes: 36 },
    { day: t('statsScreen.days.fri'), minutes: 44 },
  ];

  const weightData = [74.2, 73.9, 73.6, 73.1, 72.8, 72.5, 72.3];
  const maxWorkout = Math.max(...workoutData.map((item) => item.minutes));
  const maxWeight = Math.max(...weightData);
  const minWeight = Math.min(...weightData);
  const weightRange = maxWeight - minWeight || 1;

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <View style={styles.metricGrid}>
          <Card variant="filled" style={[styles.metricCard, styles.metricCardLarge]}>
            <Text variant="h2">77%</Text>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.metrics.completed')}
            </Text>
          </Card>
          <Card variant="filled" style={styles.metricCard}>
            <Text variant="h3">256</Text>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.metrics.caloriesBurn')}
            </Text>
          </Card>
          <Card variant="filled" style={styles.metricCard}>
            <Text variant="h3">03</Text>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.metrics.weightToLose')}
            </Text>
          </Card>
        </View>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="h3">{t('statsScreen.workout.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.workout.subtitle')}
              </Text>
            </View>
            <View style={styles.rangePill}>
              <Text variant="caption" weight="semibold">
                {t('statsScreen.weekly')}
              </Text>
            </View>
          </View>

          <View style={styles.workoutChart}>
            {workoutData.map((item) => {
              const height = (item.minutes / maxWorkout) * workoutTrackHeight;
              const isPeak = item.day === t('statsScreen.days.tue');

              return (
                <View key={item.day} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height }, isPeak && styles.barFillPeak]} />
                  </View>
                  {isPeak ? (
                    <View style={styles.badge}>
                      <Text variant="caption" color="inverse" weight="medium">
                        {t('statsScreen.peakDuration')}
                      </Text>
                    </View>
                  ) : null}
                  <Text variant="caption" color="secondary">
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card variant="elevated" style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="h3">{t('statsScreen.weightJourney.title')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('statsScreen.weightJourney.subtitle')}
              </Text>
            </View>
            <View style={styles.rangePill}>
              <Text variant="caption" weight="semibold">
                {t('statsScreen.weekly')}
              </Text>
            </View>
          </View>

          <View style={styles.lineChart}>
            {weightData.map((weight, index) => {
              const progress = (weight - minWeight) / weightRange;
              const bottom = progress * pointTrackHeight;
              return (
                <View key={`${weight}-${index}`} style={styles.pointColumn}>
                  <View style={styles.pointTrack}>
                    <View
                      style={[
                        styles.pointLine,
                        index < weightData.length - 1 && styles.pointLineActive,
                      ]}
                    />
                    <View style={[styles.pointDot, { bottom }]} />
                  </View>
                  <Text variant="caption" color="secondary">
                    {index + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card variant="filled" style={styles.macroCard}>
          <Text variant="h3">{t('statsScreen.macros.title')}</Text>
          <View style={styles.macroRow}>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.macros.carbs')}
            </Text>
            <Text variant="bodySmall" weight="semibold">
              45%
            </Text>
          </View>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, styles.macroFillPrimary, styles.macroFill45]} />
          </View>
          <View style={styles.macroRow}>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.macros.protein')}
            </Text>
            <Text variant="bodySmall" weight="semibold">
              30%
            </Text>
          </View>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, styles.macroFillAccent, styles.macroFill30]} />
          </View>
          <View style={styles.macroRow}>
            <Text variant="bodySmall" color="secondary">
              {t('statsScreen.macros.fat')}
            </Text>
            <Text variant="bodySmall" weight="semibold">
              25%
            </Text>
          </View>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, styles.macroFillSoft, styles.macroFill25]} />
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p12,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    gap: vs(6),
    backgroundColor: theme.colors.background.surface,
  },
  metricCardLarge: {
    minWidth: '100%',
    backgroundColor: theme.colors.background.section,
  },
  chartCard: {
    gap: vs(18),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p12,
  },
  rangePill: {
    paddingHorizontal: hs(14),
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  workoutChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
    height: vs(156),
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  barTrack: {
    width: '100%',
    height: theme.metrics.spacingV.p112,
    borderRadius: theme.metrics.borderRadius.full,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.background.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.disabled,
  },
  barFillPeak: {
    backgroundColor: theme.colors.brand.primary,
  },
  badge: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.secondary,
  },
  lineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
    height: vs(140),
  },
  pointColumn: {
    flex: 1,
    alignItems: 'center',
    gap: theme.metrics.spacingV.p8,
  },
  pointTrack: {
    position: 'relative',
    width: '100%',
    height: vs(110),
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pointLine: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: '100%',
    backgroundColor: theme.colors.border.default,
  },
  pointLineActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  pointDot: {
    position: 'absolute',
    width: hs(14),
    height: hs(14),
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.tertiary,
  },
  macroCard: {
    gap: theme.metrics.spacingV.p12,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroTrack: {
    width: '100%',
    height: vs(10),
    borderRadius: theme.metrics.borderRadius.full,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  macroFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  macroFillPrimary: {
    backgroundColor: theme.colors.brand.primary,
  },
  macroFill45: {
    width: '45%',
  },
  macroFillAccent: {
    backgroundColor: theme.colors.brand.tertiary,
  },
  macroFill30: {
    width: '30%',
  },
  macroFillSoft: {
    backgroundColor: theme.colors.state.info,
  },
  macroFill25: {
    width: '25%',
  },
}));

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Text } from '@/common/components';
import type { ChartBar } from '../utils/periods';

export interface CalorieBarChartProps {
  bars: ChartBar[];
}

function niceMax(value: number) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function formatAxis(value: number) {
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(value);
}

/** Simple vertical bar chart; tapping a bar reveals its value. */
export function CalorieBarChart({ bars }: CalorieBarChartProps) {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const maxTarget = Math.max(0, ...bars.map((bar) => bar.target));
  const maxValue = niceMax(Math.max(maxTarget, ...bars.map((bar) => bar.value)));
  const ticks = [maxValue, maxValue / 2, 0];
  const dense = bars.length > 12;
  const selected = bars.find((bar) => bar.key === selectedKey);

  return (
    <View style={styles.card}>
      <View style={styles.selectedRow}>
        <Text variant="bodySmall" color="secondary">
          {selected
            ? `${selected.label}: ${selected.value} ${t('common.units.kcal')}`
            : t('progress.tapBarHint')}
        </Text>
      </View>
      <View style={styles.chart}>
        <View style={styles.axis}>
          {ticks.map((tick) => (
            <Text key={tick} variant="caption" color="tertiary">
              {formatAxis(tick)}
            </Text>
          ))}
        </View>
        <View style={styles.plot}>
          {maxTarget > 0 ? (
            <View style={[styles.targetLine, styles.targetBottom((maxTarget / maxValue) * 100)]} />
          ) : null}
          {bars.map((bar) => {
            const isSelected = bar.key === selectedKey;
            const isOver = bar.target > 0 && bar.value > bar.target;

            return (
              <Pressable
                key={bar.key}
                onPress={() => setSelectedKey(isSelected ? null : bar.key)}
                accessibilityRole="button"
                accessibilityLabel={`${bar.label} ${bar.value}`}
                style={styles.barSlot}
              >
                <View style={[styles.barTrack, dense && styles.barTrackDense]}>
                  <View
                    style={[
                      styles.bar,
                      styles.barHeight((bar.value / maxValue) * 100),
                      (isSelected || (bar.isCurrent && !selectedKey)) && styles.barActive,
                      isOver && styles.barOver,
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.labels}>
        {bars.map((bar, index) => (
          <Text
            key={bar.key}
            variant="caption"
            color={bar.isCurrent ? 'primary' : 'tertiary'}
            align="center"
            style={styles.label}
            numberOfLines={1}
          >
            {dense && index % 5 !== 0 ? ' ' : bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const CHART_HEIGHT = 180;

const styles = StyleSheet.create((theme) => ({
  card: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    gap: theme.metrics.spacingV.p8,
  },
  selectedRow: {
    minHeight: theme.metrics.spacingV.p20,
  },
  chart: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    gap: theme.metrics.spacing.p8,
  },
  axis: {
    justifyContent: 'space-between',
    width: theme.metrics.spacing.p28,
  },
  plot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.state.warning,
  },
  targetBottom: (percent: number) => ({
    bottom: `${percent}%`,
  }),
  barSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '70%',
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: theme.metrics.borderRadius.md,
    backgroundColor: theme.colors.background.surfaceAlt,
    overflow: 'hidden',
  },
  barTrackDense: {
    width: '60%',
    borderRadius: theme.metrics.borderRadius.xs,
  },
  bar: {
    width: '100%',
    borderRadius: theme.metrics.borderRadius.md,
    backgroundColor: theme.colors.background.section,
  },
  barHeight: (percent: number) => ({
    height: `${Math.min(100, percent)}%`,
  }),
  barActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  barOver: {
    backgroundColor: theme.colors.state.error,
  },
  labels: {
    flexDirection: 'row',
    marginLeft: theme.metrics.spacing.p36,
  },
  label: {
    flex: 1,
  },
}));

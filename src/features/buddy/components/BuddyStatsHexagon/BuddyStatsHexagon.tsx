import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components';
import { BUDDY_AXES } from '../../constants/stats';
import type { AxisScores, BuddyAxis } from '../../types';
import {
  getAxisPoint,
  getRingPath,
  getScorePath,
  type HexagonRadii,
  type Point,
} from '../../utils/hexagonGeometry';
import { LABEL_HEIGHT, LABEL_WIDTH, styles } from './BuddyStatsHexagon.styles';

/** Share of the chart's width the outer ring's radius takes; the rest holds the labels. */
const OUTER_RADIUS_RATIO = 0.34;
/** The bubble in the middle, as a share of the outer ring; a score of 0 sits on its edge. */
const BUBBLE_RADIUS_RATIO = 0.5;
/** How much of the bubble's width Buddy takes, leaving a margin all round. */
const MASCOT_SHARE = 0.84;
/**
 * The level art fills only the lower part of its square (assets/buddy, transparent above), so
 * Buddy is lifted by this share of its size to look centred in the bubble.
 */
const MASCOT_LIFT = 0.17;
/** Grid rings, as shares of the way from the bubble's edge to the outer ring. */
const GRID_LEVELS = [0.25, 0.5, 0.75, 1] as const;
// Fixed scattered positions keep the decoration stable when scores update.
const MINI_BUBBLES = [
  { x: -0.51, y: -0.16, radius: 0.018 },
  { x: 0.24, y: -0.49, radius: 0.024 },
  { x: 0.61, y: 0.08, radius: 0.014 },
  { x: -0.32, y: 0.48, radius: 0.02 },
  { x: -0.74, y: 0.29, radius: 0.026 },
  { x: 0.46, y: -0.64, radius: 0.012 },
  { x: 0.64, y: 0.5, radius: 0.022 },
  { x: -0.12, y: 0.85, radius: 0.016 },
] as const;

function getRadii(size: number): HexagonRadii {
  const outer = size * OUTER_RADIUS_RATIO;
  return { inner: outer * BUBBLE_RADIUS_RATIO, outer };
}

/** Width and height Buddy should be drawn at so it sits inside the bubble of a `size` chart. */
export function getHexagonCenterSize(size: number) {
  return Math.floor(getRadii(size).inner * 2 * MASCOT_SHARE);
}

export interface BuddyStatsHexagonProps {
  /** Width of the chart in points. */
  size: number;
  overall: AxisScores;
  recent: AxisScores;
  onSelectAxis: (axis: BuddyAxis) => void;
  /** Drawn centred in the bubble in the middle (Buddy). */
  children?: ReactNode;
}

/**
 * Six stats on a layered hexagon grid around a bubble holding Buddy: the overall stats
 * filled, the last seven days dashed over them.
 */
export function BuddyStatsHexagon({
  size,
  overall,
  recent,
  onSelectAxis,
  children,
}: BuddyStatsHexagonProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const gap = theme.metrics.spacing.p4;
  const radii = getRadii(size);
  // The hexagon plus room for the top and bottom labels.
  const height = Math.ceil(2 * (radii.outer + gap + LABEL_HEIGHT));
  const center: Point = { x: size / 2, y: height / 2 };
  const labelDistance = radii.outer + gap + LABEL_HEIGHT / 2;
  const labelRadii: HexagonRadii = { inner: labelDistance, outer: labelDistance };
  const bubbleSize = radii.inner * 2;
  const hasScores = BUDDY_AXES.some((axis) => overall[axis] !== null);

  return (
    <View style={styles.container}>
      <View style={styles.chart(size, height)}>
        <Svg width={size} height={height} style={styles.layer}>
          <Defs>
            <LinearGradient id="buddyScoreFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0" stopColor={theme.colors.brand.primary} stopOpacity={0.18} />
              <Stop offset="1" stopColor={theme.colors.brand.primary} stopOpacity={0.07} />
            </LinearGradient>
          </Defs>

          <Path
            d={`${getRingPath(center, radii.inner + (radii.outer - radii.inner) * GRID_LEVELS[2])} ${getRingPath(center, radii.inner + (radii.outer - radii.inner) * GRID_LEVELS[1])}`}
            fill={theme.colors.brand.primary}
            fillOpacity={0.05}
            fillRule="evenodd"
          />
          {GRID_LEVELS.map((level) => (
            <Path
              key={level}
              d={getRingPath(center, radii.inner + (radii.outer - radii.inner) * level)}
              fill="none"
              stroke={theme.colors.brand.primary}
              strokeOpacity={level === 1 ? 0.5 : 0.16}
              strokeWidth={level === 1 ? 1.4 : 0.8}
            />
          ))}
          {BUDDY_AXES.map((axis) => {
            const end = getAxisPoint(center, radii, axis, 100);
            return (
              <Line
                key={axis}
                x1={center.x}
                y1={center.y}
                x2={end.x}
                y2={end.y}
                stroke={theme.colors.brand.primary}
                strokeOpacity={0.16}
                strokeWidth={0.8}
              />
            );
          })}

          <Path
            d={getScorePath(center, radii, overall)}
            fill="url(#buddyScoreFill)"
            stroke={theme.colors.brand.primary}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d={getScorePath(center, radii, recent)}
            fill="none"
            stroke={theme.colors.brand.primary}
            strokeOpacity={0.45}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          {BUDDY_AXES.map((axis) => {
            const score = overall[axis];

            if (score === null) {
              return null;
            }

            const point = getAxisPoint(center, radii, axis, score);
            return (
              <Circle
                key={axis}
                cx={point.x}
                cy={point.y}
                r={3.5}
                fill={theme.colors.brand.primary}
                stroke={theme.colors.background.surface}
                strokeWidth={1.5}
              />
            );
          })}
          {MINI_BUBBLES.map((bubble) => (
            <Circle
              key={bubble.x}
              cx={center.x + radii.outer * bubble.x}
              cy={center.y + radii.outer * bubble.y}
              r={radii.outer * bubble.radius}
              fill={theme.colors.background.surface}
              fillOpacity={0.8}
              stroke={theme.colors.brand.primary}
              strokeOpacity={0.22}
              strokeWidth={0.8}
            />
          ))}
        </Svg>

        <View style={styles.bubble(center, bubbleSize)} pointerEvents="none">
          <Svg width={bubbleSize} height={bubbleSize} viewBox="0 0 100 100" style={styles.layer}>
            <Defs>
              <RadialGradient id="buddyBubbleFill" cx="45%" cy="38%" r="65%">
                <Stop offset="0" stopColor={theme.colors.background.surface} />
                <Stop offset="0.8" stopColor={theme.colors.background.section} />
                <Stop offset="1" stopColor={theme.colors.brand.primary} stopOpacity={0.2} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={50}
              cy={50}
              r={48}
              fill="url(#buddyBubbleFill)"
              stroke={theme.colors.background.surface}
              strokeWidth={3}
            />
            <Circle
              cx={50}
              cy={50}
              r={49.5}
              fill="none"
              stroke={theme.colors.brand.primary}
              strokeOpacity={0.18}
              strokeWidth={1}
            />
          </Svg>
          <View style={styles.mascot(getHexagonCenterSize(size) * MASCOT_LIFT)}>{children}</View>
        </View>

        {BUDDY_AXES.map((axis) => {
          const score = overall[axis];
          const position = getAxisPoint(center, labelRadii, axis, 0);
          const name = t(`buddy.axes.${axis}.name`);

          return (
            <Pressable
              key={axis}
              onPress={() => onSelectAxis(axis)}
              accessibilityRole="button"
              accessibilityLabel={
                score === null
                  ? t('buddy.stats.axisLocked', { axis: name })
                  : t('buddy.stats.axisLabel', { axis: name, score })
              }
              hitSlop={4}
              style={({ pressed }) => [
                styles.label(
                  Math.max(0, Math.min(size - LABEL_WIDTH, position.x - LABEL_WIDTH / 2)),
                  position.y - LABEL_HEIGHT / 2
                ),
                score === null && styles.labelLocked,
                pressed && styles.labelPressed,
              ]}
            >
              <View style={styles.labelTitle}>
                <Text variant="caption" weight="medium" numberOfLines={1} style={styles.axisTitle}>
                  {t(`buddy.axes.${axis}.short`)}
                </Text>
              </View>
              {score !== null ? (
                <Text variant="body" weight="bold" color="link">
                  {score}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {hasScores ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchOverall]} />
            <Text variant="caption" color="secondary">
              {t('buddy.stats.legendOverall')}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchRecent]} />
            <Text variant="caption" color="secondary">
              {t('buddy.stats.legendRecent')}
            </Text>
          </View>
        </View>
      ) : null}
      {hasScores ? (
        <Text variant="caption" color="tertiary" align="center">
          {t('buddy.stats.subtitle')}
        </Text>
      ) : null}
    </View>
  );
}

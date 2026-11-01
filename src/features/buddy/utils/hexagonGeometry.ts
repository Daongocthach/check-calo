import { BUDDY_AXES } from '../constants/stats';
import type { AxisScores, BuddyAxis } from '../types';

export interface Point {
  x: number;
  y: number;
}

/**
 * A hexagon chart with a hole in the middle: a score of 0 sits on the inner ring and 100 on
 * the outer one, so whatever is drawn in the hole stays uncovered.
 */
export interface HexagonRadii {
  inner: number;
  outer: number;
}

/** Axes run clockwise from the top, 60° apart. */
export function getAxisAngle(axis: BuddyAxis) {
  return -Math.PI / 2 + (BUDDY_AXES.indexOf(axis) * 2 * Math.PI) / BUDDY_AXES.length;
}

/** Where `score` (0-100) sits on an axis. */
export function getAxisPoint(
  center: Point,
  radii: HexagonRadii,
  axis: BuddyAxis,
  score: number
): Point {
  const angle = getAxisAngle(axis);
  const share = Math.min(100, Math.max(0, score)) / 100;
  const distance = radii.inner + (radii.outer - radii.inner) * share;

  return {
    x: center.x + distance * Math.cos(angle),
    y: center.y + distance * Math.sin(angle),
  };
}

function toPathSegment(points: Point[]) {
  return `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')} Z`;
}

/** The scores' outline; a stat without data sits on the inner ring. */
export function getScorePoints(center: Point, radii: HexagonRadii, scores: AxisScores) {
  return BUDDY_AXES.map((axis) => getAxisPoint(center, radii, axis, scores[axis] ?? 0));
}

/** SVG path of the scores' outline. */
export function getScorePath(center: Point, radii: HexagonRadii, scores: AxisScores) {
  return toPathSegment(getScorePoints(center, radii, scores));
}

/**
 * SVG path filling only the band between the inner ring and the scores' outline; draw it with
 * `fillRule="evenodd"`.
 */
export function getScoreBandPath(center: Point, radii: HexagonRadii, scores: AxisScores) {
  return `${getScorePath(center, radii, scores)} ${getRingPath(center, radii.inner)}`;
}

/** SVG path of a plain hexagon ring of `radius`. */
export function getRingPath(center: Point, radius: number) {
  return toPathSegment(
    BUDDY_AXES.map((axis) => getAxisPoint(center, { inner: radius, outer: radius }, axis, 0))
  );
}

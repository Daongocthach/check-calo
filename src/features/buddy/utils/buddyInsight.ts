import { BUDDY_AXES } from '../constants/stats';
import type { AxisScores, BuddyAxis } from '../types';

/** Every stat at or above this reads as doing well. */
const STRONG_SCORE = 80;

export interface BuddyInsight {
  strongest: BuddyAxis | null;
  /** Null when every stat is doing well. */
  weakest: BuddyAxis | null;
}

/** The stats Buddy talks about: the best one, and the worst one if it needs work. */
export function getBuddyInsight(scores: AxisScores): BuddyInsight | null {
  const scored = BUDDY_AXES.filter((axis) => scores[axis] !== null).map((axis) => ({
    axis,
    score: scores[axis] ?? 0,
  }));

  if (scored.length === 0) {
    return null;
  }

  const sorted = [...scored].sort((first, second) => second.score - first.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return {
    strongest: strongest.score >= STRONG_SCORE ? strongest.axis : null,
    weakest: weakest.score < STRONG_SCORE ? weakest.axis : null,
  };
}

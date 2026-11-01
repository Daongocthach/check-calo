import type { BuddyLevelDefinition, BuddyStage } from '../types';

/**
 * Two levels per stage. Each stage starts at the points it needed when there were five
 * levels (300 Junior, 800 Teen, 1500 Pro, 2500 Master), so nobody drops a stage.
 */
export const BUDDY_LEVELS: BuddyLevelDefinition[] = [
  { level: 1, stage: 'baby', minPoints: 0 },
  { level: 2, stage: 'baby', minPoints: 150 },
  { level: 3, stage: 'junior', minPoints: 300 },
  { level: 4, stage: 'junior', minPoints: 550 },
  { level: 5, stage: 'teen', minPoints: 800 },
  { level: 6, stage: 'teen', minPoints: 1150 },
  { level: 7, stage: 'buddy', minPoints: 1500 },
  { level: 8, stage: 'buddy', minPoints: 2000 },
  { level: 9, stage: 'master', minPoints: 2500 },
  { level: 10, stage: 'master', minPoints: 5000 },
];

export const BUDDY_STAGES: readonly BuddyStage[] = ['baby', 'junior', 'teen', 'buddy', 'master'];

/** The first level of each stage. */
export const BUDDY_STAGE_LEVELS = BUDDY_STAGES.map((stage) => {
  const levels = BUDDY_LEVELS.filter((level) => level.stage === stage);
  return { stage, first: levels[0], last: levels[levels.length - 1] };
});

/**
 * Points under the rules before quests, kept only to work out each user's starting points
 * once (see ensureLegacyPoints).
 */
export const LEGACY_POINTS = {
  /** For every 7 consecutive logged days (longest streak). */
  streakWeek: 150,
  onTargetDay: 20,
  balancedDay: 15,
  loggedDay: 10,
} as const;

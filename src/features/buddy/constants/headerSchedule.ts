import type { MascotPose } from './mascot';

/** A stretch of the day starting at `from` (minutes after midnight) and lasting until the next one. */
export interface PoseSlot {
  from: number;
  /** One is picked per day, so the header changes from day to day but not within a slot. */
  poses: readonly MascotPose[];
}

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

/** Monday to Friday, and the evening and night of the weekend. */
export const WEEKDAY_SCHEDULE: readonly PoseSlot[] = [
  { from: at(0), poses: ['sleep'] },
  { from: at(5), poses: ['box'] },
  { from: at(6, 30), poses: ['stretch', 'wave'] },
  { from: at(8), poses: ['bus'] },
  { from: at(9), poses: ['laptop', 'focus'] },
  { from: at(11), poses: ['noodles'] },
  { from: at(13), poses: ['rolling'] },
  { from: at(14), poses: ['checklist', 'reading'] },
  { from: at(15, 30), poses: ['boba', 'water'] },
  { from: at(17), poses: ['gym', 'bus'] },
  { from: at(18, 30), poses: ['popcorn'] },
  { from: at(20), poses: ['gaming', 'headphones', 'cool'] },
  { from: at(21, 30), poses: ['hoodie', 'phone-away'] },
  { from: at(22, 30), poses: ['bye', 'no-phone'] },
];

/** Saturday and Sunday swap the working day (08:00–18:30) for these. */
export const WEEKEND_DAYTIME_SCHEDULE: readonly PoseSlot[] = [
  { from: at(8), poses: ['rolling', 'boba'] },
  { from: at(11), poses: ['beach'] },
  { from: at(14), poses: ['hammock'] },
  { from: at(16, 30), poses: ['popcorn', 'cool'] },
];

export const WEEKEND_DAYTIME = { from: at(8), until: at(18, 30) };

/** Streak lengths that get the fire pose on the day they are reached. */
export const STREAK_MILESTONES: readonly number[] = [7, 14, 30];

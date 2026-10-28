import type { ImageProps } from 'expo-image';
import Level1Image from '../../../../assets/buddy/level-1.webp';
import Level2Image from '../../../../assets/buddy/level-2.webp';
import Level3Image from '../../../../assets/buddy/level-3.webp';
import Level4Image from '../../../../assets/buddy/level-4.webp';
import Level5Image from '../../../../assets/buddy/level-5.webp';
import type { BuddyLevel } from '../types';

/**
 * Artwork per level. Levels without an entry fall back to the built-in SVG placeholder.
 *
 * Orange cat poses shared with the Mewday app (256px transparent WebP in `assets/buddy/`).
 */
export const BUDDY_IMAGES: Partial<Record<BuddyLevel, ImageProps['source']>> = {
  1: Level1Image,
  2: Level2Image,
  3: Level3Image,
  4: Level4Image,
  5: Level5Image,
};

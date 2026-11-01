import type { ImageProps } from 'expo-image';
import Level1Image from '../../../../assets/buddy/level-1.webp';
import Level2Image from '../../../../assets/buddy/level-2.webp';
import Level3Image from '../../../../assets/buddy/level-3.webp';
import Level4Image from '../../../../assets/buddy/level-4.webp';
import Level5Image from '../../../../assets/buddy/level-5.webp';
import type { BuddyLevel, BuddyStage } from '../types';

/**
 * Artwork per stage (orange cat poses shared with the Mewday app, 256px transparent WebP in
 * `assets/buddy/`). Both levels of a stage use it until each level gets its own art.
 */
export const BUDDY_STAGE_IMAGES: Record<BuddyStage, ImageProps['source']> = {
  baby: Level1Image,
  junior: Level2Image,
  teen: Level3Image,
  buddy: Level4Image,
  master: Level5Image,
};

/** Art for a single level, which wins over its stage's (docs/BUDDY-LEVEL-ART.md). */
export const BUDDY_IMAGES: Partial<Record<BuddyLevel, ImageProps['source']>> = {};

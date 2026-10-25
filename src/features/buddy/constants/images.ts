import type { ImageSourcePropType } from 'react-native';
import type { BuddyLevel } from '../types';

/**
 * Artwork per level. Levels without an entry fall back to the built-in SVG placeholder.
 *
 * To use real art, drop a transparent PNG in `assets/buddy/` and register it, e.g.
 *   3: require('../../../../assets/buddy/level-3.png'),
 */
export const BUDDY_IMAGES: Partial<Record<BuddyLevel, ImageSourcePropType>> = {};

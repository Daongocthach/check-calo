import type { ImageProps } from 'expo-image';
import CelebrateImage from '../../../../assets/mascot/celebrate.webp';
import NoodlesImage from '../../../../assets/mascot/noodles.webp';
import StretchImage from '../../../../assets/mascot/stretch.webp';

/**
 * Buddy's mood stickers (256px transparent WebP in `assets/mascot/`, sharp up to ~85pt).
 *
 * Only poses imported here end up in the app bundle: add a pose when a screen starts using it.
 */
export const MASCOT_IMAGES = {
  celebrate: CelebrateImage,
  noodles: NoodlesImage,
  stretch: StretchImage,
} satisfies Record<string, ImageProps['source']>;

export type MascotPose = keyof typeof MASCOT_IMAGES;

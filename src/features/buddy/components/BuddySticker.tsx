import { Image } from 'expo-image';
import { StyleSheet } from 'react-native-unistyles';
import { MASCOT_IMAGES } from '../constants/mascot';
import type { MascotPose } from '../constants/mascot';

export interface BuddyStickerProps {
  pose: MascotPose;
  /** Rendered width and height in points. The artwork is 256px, so above ~85pt it softens on @3x. */
  size: number;
}

/** One of Buddy's mood poses. Decorative: the text next to it carries the meaning. */
export function BuddySticker({ pose, size }: BuddyStickerProps) {
  return (
    <Image
      source={MASCOT_IMAGES[pose]}
      style={styles.image(size)}
      contentFit="contain"
      accessible={false}
    />
  );
}

const styles = StyleSheet.create({
  image: (size: number) => ({
    width: size,
    height: size,
  }),
});

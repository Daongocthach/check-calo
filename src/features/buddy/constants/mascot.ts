import type { ImageProps } from 'expo-image';
import BeachImage from '../../../../assets/mascot/beach.webp';
import BobaImage from '../../../../assets/mascot/boba.webp';
import BoxImage from '../../../../assets/mascot/box.webp';
import BusImage from '../../../../assets/mascot/bus.webp';
import ByeImage from '../../../../assets/mascot/bye.webp';
import CelebrateImage from '../../../../assets/mascot/celebrate.webp';
import ChecklistImage from '../../../../assets/mascot/checklist.webp';
import CoinImage from '../../../../assets/mascot/coin.webp';
import CoolImage from '../../../../assets/mascot/cool.webp';
import FireImage from '../../../../assets/mascot/fire.webp';
import FocusImage from '../../../../assets/mascot/focus.webp';
import GamingImage from '../../../../assets/mascot/gaming.webp';
import GiftImage from '../../../../assets/mascot/gift.webp';
import GymImage from '../../../../assets/mascot/gym.webp';
import HammockImage from '../../../../assets/mascot/hammock.webp';
import HeadphonesImage from '../../../../assets/mascot/headphones.webp';
import HoodieImage from '../../../../assets/mascot/hoodie.webp';
import LaptopImage from '../../../../assets/mascot/laptop.webp';
import NoPhoneImage from '../../../../assets/mascot/no-phone.webp';
import NoodlesImage from '../../../../assets/mascot/noodles.webp';
import PhoneAwayImage from '../../../../assets/mascot/phone-away.webp';
import PopcornImage from '../../../../assets/mascot/popcorn.webp';
import ReadingImage from '../../../../assets/mascot/reading.webp';
import RollingImage from '../../../../assets/mascot/rolling.webp';
import SleepImage from '../../../../assets/mascot/sleep.webp';
import StretchImage from '../../../../assets/mascot/stretch.webp';
import TrophyImage from '../../../../assets/mascot/trophy.webp';
import WaterImage from '../../../../assets/mascot/water.webp';
import WaveImage from '../../../../assets/mascot/wave.webp';

/**
 * Buddy's mood stickers (256px transparent WebP in `assets/mascot/`, sharp up to ~85pt).
 *
 * Only poses imported here end up in the app bundle: add a pose when a screen starts using it.
 */
export const MASCOT_IMAGES = {
  beach: BeachImage,
  boba: BobaImage,
  box: BoxImage,
  bus: BusImage,
  bye: ByeImage,
  celebrate: CelebrateImage,
  checklist: ChecklistImage,
  coin: CoinImage,
  cool: CoolImage,
  fire: FireImage,
  focus: FocusImage,
  gaming: GamingImage,
  gift: GiftImage,
  gym: GymImage,
  hammock: HammockImage,
  headphones: HeadphonesImage,
  hoodie: HoodieImage,
  laptop: LaptopImage,
  'no-phone': NoPhoneImage,
  noodles: NoodlesImage,
  'phone-away': PhoneAwayImage,
  popcorn: PopcornImage,
  reading: ReadingImage,
  rolling: RollingImage,
  sleep: SleepImage,
  stretch: StretchImage,
  trophy: TrophyImage,
  water: WaterImage,
  wave: WaveImage,
} satisfies Record<string, ImageProps['source']>;

export type MascotPose = keyof typeof MASCOT_IMAGES;

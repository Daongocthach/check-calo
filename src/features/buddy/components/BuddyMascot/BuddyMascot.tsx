import { Image } from 'expo-image';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { StyleSheet } from 'react-native-unistyles';
import { BUDDY_IMAGES } from '../../constants/images';
import { BUDDY_PALETTE } from '../../constants/palette';
import type { BuddyLevel } from '../../types';

export interface BuddyMascotProps {
  level: BuddyLevel;
  /** Rendered width and height in points. Defaults to 120. */
  size?: number;
  /** Greyed-out look for levels not reached yet. */
  locked?: boolean;
}

type Palette = (typeof BUDDY_PALETTE)[keyof typeof BUDDY_PALETTE];

function Sparkle({ x, y, scale, color }: { x: number; y: number; scale: number; color: string }) {
  return (
    <Path
      d={`M${x} ${y - 8 * scale} L${x + 2.5 * scale} ${y - 2.5 * scale} L${x + 8 * scale} ${y} L${
        x + 2.5 * scale
      } ${y + 2.5 * scale} L${x} ${y + 8 * scale} L${x - 2.5 * scale} ${y + 2.5 * scale} L${
        x - 8 * scale
      } ${y} L${x - 2.5 * scale} ${y - 2.5 * scale} Z`}
      fill={color}
    />
  );
}

function Accessories({ level, palette }: { level: BuddyLevel; palette: Palette }) {
  return (
    <G>
      {level === 2 ? (
        <G>
          <Path d="M100 62 Q98 44 102 32" stroke={palette.leafDark} strokeWidth={4} fill="none" />
          <Ellipse
            cx={90}
            cy={34}
            rx={12}
            ry={6}
            fill={palette.leaf}
            rotation={-25}
            origin="90,34"
          />
          <Ellipse
            cx={112}
            cy={30}
            rx={12}
            ry={6}
            fill={palette.leaf}
            rotation={25}
            origin="112,30"
          />
        </G>
      ) : null}
      {level >= 3 ? (
        <G>
          <Path d="M62 74 L56 46 L78 66 Z" fill={palette.horn} />
          <Path d="M138 74 L144 46 L122 66 Z" fill={palette.horn} />
        </G>
      ) : null}
      {level === 5 ? (
        <G>
          <Path d="M74 52 L78 26 L90 40 L100 20 L110 40 L122 26 L126 52 Z" fill={palette.crown} />
          <Circle cx={100} cy={42} r={5} fill={palette.crownGem} />
        </G>
      ) : null}
    </G>
  );
}

function MascotSvg({
  level,
  size,
  palette,
}: {
  level: BuddyLevel;
  size: number;
  palette: Palette;
}) {
  const isBaby = level === 1;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {level >= 3 ? (
        <G>
          <Sparkle x={30} y={60} scale={1} color={palette.sparkle} />
          <Sparkle x={172} y={78} scale={0.8} color={palette.sparkle} />
          <Sparkle x={160} y={36} scale={0.6} color={palette.sparkle} />
        </G>
      ) : null}

      <Path
        d="M56 84 L64 54 L78 74 L88 44 L100 68 L112 44 L122 74 L136 54 L144 84 Z"
        fill={palette.spikes}
      />
      <Accessories level={level} palette={palette} />

      {!isBaby ? (
        <G>
          <Ellipse cx={78} cy={176} rx={17} ry={9} fill={palette.bodyShade} />
          <Ellipse cx={122} cy={176} rx={17} ry={9} fill={palette.bodyShade} />
        </G>
      ) : null}

      <Ellipse
        cx={42}
        cy={134}
        rx={10}
        ry={16}
        fill={palette.bodyShade}
        rotation={20}
        origin="42,134"
      />
      <Ellipse
        cx={158}
        cy={134}
        rx={10}
        ry={16}
        fill={palette.bodyShade}
        rotation={-20}
        origin="158,134"
      />
      <Ellipse cx={100} cy={122} rx={62} ry={58} fill={palette.body} />
      <Ellipse cx={100} cy={154} rx={34} ry={22} fill={palette.belly} />

      <Ellipse cx={78} cy={112} rx={16} ry={19} fill={palette.eyeWhite} />
      <Ellipse cx={122} cy={112} rx={16} ry={19} fill={palette.eyeWhite} />
      <Circle cx={80} cy={116} r={10} fill={palette.pupil} />
      <Circle cx={124} cy={116} r={10} fill={palette.pupil} />
      <Circle cx={84} cy={110} r={4} fill={palette.eyeWhite} />
      <Circle cx={128} cy={110} r={4} fill={palette.eyeWhite} />

      <Ellipse cx={62} cy={134} rx={9} ry={5} fill={palette.cheek} />
      <Ellipse cx={138} cy={134} rx={9} ry={5} fill={palette.cheek} />
      <Path
        d="M90 134 Q100 146 110 134"
        stroke={palette.mouth}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />

      {level === 4 ? (
        <G>
          <Path d="M50 142 Q100 160 150 142 L150 154 Q100 172 50 154 Z" fill={palette.scarf} />
          <Path d="M128 156 L140 186 L124 182 L118 160 Z" fill={palette.scarf} />
        </G>
      ) : null}

      {isBaby ? (
        <Path
          d="M36 150 L50 138 L62 152 L76 138 L90 152 L104 138 L118 152 L132 138 L146 152 L164 140 L164 176 Q100 204 36 176 Z"
          fill={palette.shell}
          stroke={palette.shellLine}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

/**
 * Buddy mascot for a level. Uses registered artwork from `BUDDY_IMAGES` when available,
 * otherwise draws the SVG placeholder.
 */
export function BuddyMascot({ level, size = 120, locked = false }: BuddyMascotProps) {
  const imageSource = BUDDY_IMAGES[level];

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        style={[styles.image(size), locked && styles.locked]}
        contentFit="contain"
      />
    );
  }

  return (
    <MascotSvg
      level={level}
      size={size}
      palette={locked ? BUDDY_PALETTE.locked : BUDDY_PALETTE.active}
    />
  );
}

const styles = StyleSheet.create(() => ({
  image: (size: number) => ({
    width: size,
    height: size,
  }),
  locked: {
    opacity: 0.45,
  },
}));

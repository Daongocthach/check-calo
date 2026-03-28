import type { ThemeColors } from './types';

export const lightColors: ThemeColors = {
  mode: 'light',

  brand: {
    primary: '#E3F45A',
    secondary: '#203214',
    tertiary: '#FF9E3D',
    primaryVariant: '#D2E93B',
    secondaryVariant: '#345125',
    onBrand: '#FFFFFF',
  },

  background: {
    app: '#F6F9E8',
    surface: '#FFFEF8',
    surfaceAlt: '#F0F5D8',
    section: '#ECF6C2',
    elevated: '#FBFDEB',
    input: '#F4F7E3',
    disabled: '#D8E1BF',
    modal: '#FFFEF8',
  },

  text: {
    primary: '#203214',
    secondary: '#51633F',
    tertiary: '#738260',
    muted: '#98A389',
    inverse: '#FFFFFF',
    accent: '#FF9E3D',
    link: '#7BA120',
    linkHover: '#6C8E19',
    onBrand: '#FFFFFF',
  },

  border: {
    default: '#D9E6B2',
    subtle: '#EDF3D3',
    strong: '#B9C98B',
    focus: '#D2E93B',
    disabled: '#D8E1BF',
  },

  icon: {
    primary: '#203214',
    secondary: '#51633F',
    tertiary: '#889777',
    muted: '#B0B99C',
    inverse: '#FFFFFF',
    accent: '#FF9E3D',
    onBrand: '#FFFFFF',
  },

  state: {
    success: '#57A645',
    successBg: '#E7F5D9',
    warning: '#FFB21D',
    warningBg: 'rgba(255, 178, 29, 0.18)',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',
    info: '#3A86FF',
    infoBg: 'rgba(58, 134, 255, 0.14)',
    disabled: '#B0B99C',
  },

  overlay: {
    modal: 'rgba(0, 0, 0, 0.5)',
    pressed: 'rgba(227, 244, 90, 0.18)',
    hover: 'rgba(227, 244, 90, 0.1)',
    focus: 'rgba(210, 233, 59, 0.2)',
    ripple: 'rgba(255, 255, 255, 0.25)',
    shadow: 'rgba(32, 50, 20, 0.14)',
  },

  gradient: {
    primary: ['#F1F8B2', '#E3F45A'],
    secondary: ['#F6FBE0', '#DFF17A'],
    accent: ['#FFD37A', '#FF9E3D'],
    success: ['#B9E67A', '#57A645'],
    error: ['#B91C1C', '#F87171'],
    warning: ['#FFE66C', '#FFB21D'],
    highlight: ['#DFF7AE', '#C3EE4A'],
  },

  shadow: {
    color: 'rgba(32, 50, 20, 0.14)',
    elevation: 4,
    elevationSmall: 2,
    elevationMedium: 4,
    elevationLarge: 8,
  },
};

export default lightColors;

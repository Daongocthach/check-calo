import type { ThemeColors } from './types';

export const darkColors: ThemeColors = {
  mode: 'dark',

  brand: {
    primary: '#9FE33D',
    secondary: '#F5F7FF',
    tertiary: '#FFD34D',
    primaryVariant: '#B6F05F',
    secondaryVariant: '#DDE4FF',
    onBrand: '#081008',
  },

  background: {
    app: '#04050A',
    surface: '#0B0E18',
    surfaceAlt: '#12162A',
    section: '#171C34',
    elevated: '#0E1222',
    input: '#141A2E',
    disabled: '#10141F',
    modal: '#0A0D17',
  },

  text: {
    primary: '#F5F7FF',
    secondary: '#B9BED3',
    tertiary: '#7E849C',
    muted: '#5A6075',
    inverse: '#0F172A',
    accent: '#FFD34D',
    link: '#B6F05F',
    linkHover: '#D4FF8A',
    onBrand: '#081008',
  },

  border: {
    default: '#232944',
    subtle: '#171B2F',
    strong: '#353D61',
    focus: '#B6F05F',
    disabled: '#12182A',
  },

  icon: {
    primary: '#F5F7FF',
    secondary: '#B9BED3',
    tertiary: '#7E849C',
    muted: '#5A6075',
    inverse: '#0F172A',
    accent: '#FFD34D',
    onBrand: '#081008',
  },

  state: {
    success: '#8DFFB4',
    successBg: 'rgba(141, 255, 180, 0.16)',
    warning: '#FFD34D',
    warningBg: 'rgba(255, 211, 77, 0.2)',
    error: '#FF7D7D',
    errorBg: 'rgba(255, 125, 125, 0.18)',
    info: '#67D8FF',
    infoBg: 'rgba(103, 216, 255, 0.18)',
    disabled: '#4D5468',
  },

  overlay: {
    modal: 'rgba(2, 3, 8, 0.8)',
    pressed: 'rgba(159, 227, 61, 0.16)',
    hover: 'rgba(159, 227, 61, 0.08)',
    focus: 'rgba(182, 240, 95, 0.22)',
    ripple: 'rgba(255, 255, 255, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.62)',
  },

  gradient: {
    primary: ['#67D8FF', '#FFF23A'],
    secondary: ['#1F2E78', '#6AC6FF'],
    accent: ['#FFC83D', '#FFE96C'],
    success: ['#4D7F22', '#9FE33D'],
    error: ['#A73A56', '#FF7D7D'],
    warning: ['#D9A52A', '#FFF23A'],
    highlight: ['#3F5C1B', '#B6F05F'],
  },

  shadow: {
    color: 'rgba(0, 0, 0, 0.62)',
    elevation: 6,
    elevationSmall: 2,
    elevationMedium: 6,
    elevationLarge: 12,
  },
};

export default darkColors;

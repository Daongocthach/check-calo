import type { ThemeColors } from './types';

export const darkColors: ThemeColors = {
  mode: 'dark',

  brand: {
    primary: '#8FAA3B',
    secondary: '#EFF7CE',
    tertiary: '#FFB34D',
    primaryVariant: '#A9C94A',
    secondaryVariant: '#FBFFE8',
    onBrand: '#FFFFFF',
  },

  background: {
    app: '#12190D',
    surface: '#1A2411',
    surfaceAlt: '#23301A',
    section: '#24351A',
    elevated: '#202D16',
    input: '#26341B',
    disabled: '#172010',
    modal: '#1A2411',
  },

  text: {
    primary: '#F6F8E8',
    secondary: '#D6E2BA',
    tertiary: '#A6B58E',
    muted: '#788566',
    inverse: '#0F172A',
    accent: '#FFB34D',
    link: '#E3F45A',
    linkHover: '#F1F8B2',
    onBrand: '#FFFFFF',
  },

  border: {
    default: '#344626',
    subtle: '#202D16',
    strong: '#4E6540',
    focus: '#A9C94A',
    disabled: '#172010',
  },

  icon: {
    primary: '#F6F8E8',
    secondary: '#D6E2BA',
    tertiary: '#93A57B',
    muted: '#5B6B4A',
    inverse: '#0F172A',
    accent: '#FFB34D',
    onBrand: '#FFFFFF',
  },

  state: {
    success: '#8CD36D',
    successBg: 'rgba(140, 211, 109, 0.18)',
    warning: '#FFD84C',
    warningBg: 'rgba(255, 216, 76, 0.2)',
    error: '#F87171',
    errorBg: 'rgba(248, 113, 113, 0.2)',
    info: '#60A5FA',
    infoBg: 'rgba(96, 165, 250, 0.2)',
    disabled: '#5B6B4A',
  },

  overlay: {
    modal: 'rgba(0, 0, 0, 0.7)',
    pressed: 'rgba(143, 170, 59, 0.18)',
    hover: 'rgba(143, 170, 59, 0.1)',
    focus: 'rgba(169, 201, 74, 0.24)',
    ripple: 'rgba(255, 255, 255, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },

  gradient: {
    primary: ['#2B3D1C', '#8FAA3B'],
    secondary: ['#1F2A14', '#6F8E30'],
    accent: ['#6A470D', '#FFB34D'],
    success: ['#365A24', '#8CD36D'],
    error: ['#7F1D1D', '#F87171'],
    warning: ['#7A5A12', '#FFD84C'],
    highlight: ['#314B1F', '#98B93F'],
  },

  shadow: {
    color: 'rgba(0, 0, 0, 0.5)',
    elevation: 6,
    elevationSmall: 2,
    elevationMedium: 6,
    elevationLarge: 12,
  },
};

export default darkColors;

import type { ThemeColors } from './types';

export const lightColors: ThemeColors = {
  mode: 'light',

  brand: {
    primary: '#52A13C', // xanh chính (calories ring)
    secondary: '#1C1C1E', // text chính
    tertiary: '#FF7A2F', // CTA (+ button)
    primaryVariant: '#6FB85A',
    secondaryVariant: '#6B7280',
    onBrand: '#FFFFFF',
  },

  background: {
    app: '#F7F7F7', // nền chính
    surface: '#FFFFFF', // card
    surfaceAlt: '#FAFAFA',
    section: '#F0F2F4',
    elevated: '#FFFFFF',
    input: '#F3F4F6',
    disabled: '#E5E7EB',
    modal: '#FFFFFF',
  },

  text: {
    primary: '#1C1C1E', // text đậm
    secondary: '#6B7280', // text phụ
    tertiary: '#9CA3AF', // text mờ
    muted: '#B0B3B8',
    inverse: '#FFFFFF',
    accent: '#FF7A2F',
    link: '#52A13C',
    linkHover: '#438130',
  },

  border: {
    default: '#E5E7EB',
    subtle: '#F0F2F4',
    strong: '#D1D5DB',
    focus: '#52A13C',
    disabled: '#E5E7EB',
  },

  icon: {
    primary: '#1C1C1E',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    muted: '#B0B3B8',
    inverse: '#FFFFFF',
    accent: '#FF7A2F',
  },

  state: {
    success: '#52A13C', // fat
    successBg: '#F1FBEA',

    warning: '#F5A623', // carb
    warningBg: '#FFF3E0',

    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.12)',

    info: '#4A90E2', // protein
    infoBg: '#EAF3FF',

    disabled: '#B0B3B8',
  },

  overlay: {
    modal: 'rgba(0, 0, 0, 0.5)',
    pressed: 'rgba(82, 161, 60, 0.15)',
    hover: 'rgba(82, 161, 60, 0.08)',
    focus: 'rgba(82, 161, 60, 0.2)',
    ripple: 'rgba(0, 0, 0, 0.08)',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },

  gradient: {
    primary: ['#52A13C', '#8ED36F'], // vòng calories đẹp hơn
    secondary: ['#FFFFFF', '#F3F4F6'],
    accent: ['#FF8C42', '#FF7A2F'],

    success: ['#B9E67A', '#7ED321'],
    error: ['#F87171', '#EF4444'],
    warning: ['#FFD37A', '#F5A623'],

    highlight: ['#E8F5E9', '#C8E6C9'],
  },

  shadow: {
    color: 'rgba(0, 0, 0, 0.08)',
    onShadow: '#FFFFFF',
    elevation: 4,
    elevationSmall: 2,
    elevationMedium: 4,
    elevationLarge: 8,
  },
};

export default lightColors;

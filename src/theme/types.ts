export interface BrandColors {
  primary: string;
  secondary: string;
  tertiary: string;
  primaryVariant: string;
  secondaryVariant: string;
  onBrand: string;
}

export interface BackgroundColors {
  app: string;
  surface: string;
  surfaceAlt: string;
  section: string;
  elevated: string;
  input: string;
  disabled: string;
  modal: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  muted: string;
  inverse: string;
  accent: string;
  link: string;
  linkHover: string;
}

export interface BorderColors {
  default: string;
  subtle: string;
  strong: string;
  focus: string;
  disabled: string;
}

export interface IconColors {
  primary: string;
  secondary: string;
  tertiary: string;
  muted: string;
  inverse: string;
  accent: string;
}

export interface StateColors {
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  disabled: string;
}

export interface OverlayColors {
  modal: string;
  /** Near-opaque backdrop for full-screen media such as image previews. */
  scrim: string;
  pressed: string;
  hover: string;
  focus: string;
  ripple: string;
  shadow: string;
}

/** iOS `UIAlertController`-style alert dialog. */
export interface AlertColors {
  /** Dim behind the alert, lighter than `overlay.modal`. */
  backdrop: string;
  /** Translucent tint layered over the blur (iOS). */
  surface: string;
  /** Opaque card fill where blur is unavailable (Android). */
  surfaceSolid: string;
  separator: string;
  /** Highlight on a pressed button row. */
  pressed: string;
  /** Button text for default and cancel actions. */
  action: string;
  /** Button text for the cancel action. */
  cancel: string;
  destructive: string;
}

export interface GradientColors {
  primary: [string, string];
  secondary: [string, string];
  accent: [string, string];
  success: [string, string];
  error: [string, string];
  warning: [string, string];
  highlight: [string, string];
}

export interface ShadowConfig {
  color: string;
  onShadow: string;
  elevation: number;
  elevationSmall: number;
  elevationMedium: number;
  elevationLarge: number;
}

export interface ThemeColors {
  mode: 'light' | 'dark';
  brand: BrandColors;
  background: BackgroundColors;
  text: TextColors;
  border: BorderColors;
  icon: IconColors;
  state: StateColors;
  overlay: OverlayColors;
  alert: AlertColors;
  gradient: GradientColors;
  shadow: ShadowConfig;
}

import { UnistylesRuntime } from 'react-native-unistyles';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';
import {
  compositeThemeName,
  parseCompositeThemeName,
  THEME_PRESET_NAMES,
  type ThemePresetName,
} from './config';

export type ThemeModePreference = 'system' | 'light' | 'dark';

function resolveSystemMode(): 'light' | 'dark' {
  return UnistylesRuntime.colorScheme === 'dark' ? 'dark' : 'light';
}

export function getThemePreference(): ThemeModePreference {
  const result = getItem<string>(STORAGE_KEYS.preferences.theme);
  if (result.success && result.data && ['system', 'light', 'dark'].includes(result.data)) {
    return result.data as ThemeModePreference;
  }
  return 'light';
}

export function setThemeMode(mode: ThemeModePreference) {
  const preset = getCurrentPreset();
  const resolvedMode = mode === 'system' ? resolveSystemMode() : mode;
  const target = compositeThemeName(preset, resolvedMode);
  UnistylesRuntime.setTheme(target);
  setItem(STORAGE_KEYS.preferences.theme, mode);
}

export function handleSystemThemeChange(): void {
  if (getThemePreference() !== 'system') {
    return;
  }
  const preset = getCurrentPreset();
  UnistylesRuntime.setTheme(compositeThemeName(preset, resolveSystemMode()));
}

export function applyThemePreset(preset: ThemePresetName) {
  const preference = getThemePreference();
  const mode = preference === 'system' ? resolveSystemMode() : preference;
  const target = compositeThemeName(preset, mode);
  UnistylesRuntime.setTheme(target);
  setItem(STORAGE_KEYS.preferences.themePreset, preset);
}

export function toggleDarkMode(isDark: boolean) {
  setThemeMode(isDark ? 'dark' : 'light');
}

export function getCurrentMode(): 'light' | 'dark' {
  const currentName = UnistylesRuntime.themeName;
  if (currentName && typeof currentName === 'string') {
    const { mode } = parseCompositeThemeName(currentName);
    return mode;
  }
  const result = getItem<string>(STORAGE_KEYS.preferences.theme);
  if (!result.success || !result.data || result.data === 'system') {
    return resolveSystemMode();
  }
  return result.data === 'dark' ? 'dark' : 'light';
}

export function getCurrentPreset(): ThemePresetName {
  const result = getItem<string>(STORAGE_KEYS.preferences.themePreset);
  if (
    result.success &&
    result.data &&
    THEME_PRESET_NAMES.includes(result.data as ThemePresetName)
  ) {
    return result.data as ThemePresetName;
  }
  return 'default';
}

export function initializeTheme() {
  // Theme is initialized via StyleSheet.configure({ settings: { initialTheme } })
}

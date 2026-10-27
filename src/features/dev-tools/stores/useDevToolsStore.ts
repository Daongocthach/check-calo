import { create } from 'zustand';
import { getItem, setItem, STORAGE_KEYS } from '@/utils/storage';

/** How Check AI answers while dev mode is on. */
export type DevChatScenario = 'normal' | 'slow' | 'quota' | 'auth' | 'error';

interface DevToolsState {
  /** Persisted switch from Settings; only honoured in dev builds. */
  enabled: boolean;
  /** Home shows an empty diary regardless of logged entries. */
  forceEmptyDiary: boolean;
  chatScenario: DevChatScenario;
  /** The chat barcode button returns a sample barcode instead of opening the camera. */
  fakeBarcodeScan: boolean;
  setEnabled: (enabled: boolean) => void;
  setForceEmptyDiary: (value: boolean) => void;
  setChatScenario: (value: DevChatScenario) => void;
  setFakeBarcodeScan: (value: boolean) => void;
}

function readEnabled() {
  if (!__DEV__) {
    return false;
  }

  const result = getItem<boolean>(STORAGE_KEYS.preferences.devMode);
  return result.success && result.data === true;
}

/** Overrides are in-memory on purpose: a reload brings every screen back to real data. */
export const useDevToolsStore = create<DevToolsState>((set) => ({
  enabled: readEnabled(),
  forceEmptyDiary: false,
  chatScenario: 'normal',
  fakeBarcodeScan: false,
  setEnabled: (enabled) => {
    setItem(STORAGE_KEYS.preferences.devMode, enabled);
    // Turning dev mode off also clears every override.
    set(
      enabled
        ? { enabled }
        : { enabled, forceEmptyDiary: false, chatScenario: 'normal', fakeBarcodeScan: false }
    );
  },
  setForceEmptyDiary: (forceEmptyDiary) => set({ forceEmptyDiary }),
  setChatScenario: (chatScenario) => set({ chatScenario }),
  setFakeBarcodeScan: (fakeBarcodeScan) => set({ fakeBarcodeScan }),
}));

/** Whether dev mode is active right now (always false in release builds). */
export function isDevModeActive() {
  return __DEV__ && useDevToolsStore.getState().enabled;
}

/** Reactive variant of {@link isDevModeActive} for components and hooks. */
export function useDevModeActive() {
  return useDevToolsStore((state) => __DEV__ && state.enabled);
}

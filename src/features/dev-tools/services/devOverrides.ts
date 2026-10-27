import { SAMPLE_BARCODE } from '../constants/sampleFoods';
import { isDevModeActive, useDevToolsStore } from '../stores/useDevToolsStore';

const SLOW_REPLY_MS = 3000;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Applies the chosen Check AI scenario before a real request. Error messages match the ones the
 * chat already recognises, so the same UI paths are exercised.
 */
export async function applyDevChatScenario() {
  if (!isDevModeActive()) {
    return;
  }

  switch (useDevToolsStore.getState().chatScenario) {
    case 'slow':
      await wait(SLOW_REPLY_MS);
      return;
    case 'quota':
      await wait(600);
      throw new Error('Daily AI usage limit reached');
    case 'auth':
      await wait(600);
      throw new Error('Authentication required');
    case 'error':
      await wait(600);
      throw new Error('Simulated AI failure');
    default:
      return;
  }
}

/** Sample barcode to use instead of the camera, or null to scan for real. */
export function getDevFakeBarcode() {
  return isDevModeActive() && useDevToolsStore.getState().fakeBarcodeScan ? SAMPLE_BARCODE : null;
}

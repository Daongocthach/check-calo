import type { ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import { AppAlertProvider } from './app-alert';
import { CameraProvider } from './camera';

/**
 * Overlay hosts for a screen presented as a native modal (`formSheet`, `modal`, ...).
 *
 * The root hosts live under the navigator's root view controller, so on iOS they either render
 * behind a natively presented screen (alerts, toasts) or fail to present at all (the camera's RN
 * `Modal`). Wrapping the screen gives it its own camera, alert and toast hosts; the root ones take
 * over again when it closes.
 */
export function ModalScreenOverlays({ children }: { children: ReactNode }) {
  return (
    <CameraProvider>
      <AppAlertProvider>{children}</AppAlertProvider>
      <Toast />
    </CameraProvider>
  );
}

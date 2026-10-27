import { Alert } from 'react-native';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

export interface AppAlertOptions {
  dismissOnBackdropPress?: boolean;
}

export interface AppAlertPayload {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
  options?: AppAlertOptions;
}

type AlertHandler = (payload: AppAlertPayload) => void;

/**
 * Mounted alert hosts, newest last. A native modal screen (e.g. the chat form sheet) mounts its own
 * host so alerts render above it; the root host takes over again once it unmounts.
 */
let alertHandlers: AlertHandler[] = [];

export function registerAppAlertHandler(handler: AlertHandler) {
  alertHandlers = [...alertHandlers, handler];

  return () => {
    alertHandlers = alertHandlers.filter((item) => item !== handler);
  };
}

export const appAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) {
    const alertHandler = alertHandlers[alertHandlers.length - 1];

    if (alertHandler) {
      alertHandler({ title, message, buttons, options });
      return;
    }

    Alert.alert(
      title,
      message,
      buttons?.map((button) => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style,
      }))
    );
  },
};

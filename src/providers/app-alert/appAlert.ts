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

let alertHandler: AlertHandler | null = null;

export function registerAppAlertHandler(handler: AlertHandler) {
  alertHandler = handler;

  return () => {
    if (alertHandler === handler) {
      alertHandler = null;
    }
  };
}

export const appAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) {
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

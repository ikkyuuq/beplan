import { Alert as NativeAlert, AlertButton, AlertOptions, Platform } from "react-native";

/**
 * Drop-in replacement for React Native's `Alert`.
 *
 * On iOS/Android it is exactly `Alert.alert`. On web, react-native-web's
 * `Alert.alert` is an empty function: no message appears and no button's
 * `onPress` ever runs (e.g. "Discard changes?" -> Back did nothing). Here the
 * browser's own dialogs are used instead:
 * - no buttons / one button: `window.alert`, then that button's onPress
 * - a cancel + an action button: `window.confirm`; OK runs the action,
 *   Cancel runs the cancel button's onPress (if any)
 */
const isCancel = (button: AlertButton) =>
  button.style === "cancel" || /^(cancel|no)$/i.test(button.text ?? "");

function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancel = buttons.find(isCancel);
  const action = buttons.find((button) => !isCancel(button)) ?? buttons[0];
  if (window.confirm(text)) {
    action.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}

export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    if (Platform.OS === "web") {
      webAlert(title, message, buttons);
    } else {
      NativeAlert.alert(title, message, buttons, options);
    }
  },
};

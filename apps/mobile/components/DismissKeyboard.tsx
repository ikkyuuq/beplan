import { ReactElement } from "react";
import { Keyboard, Platform, TouchableWithoutFeedback } from "react-native";

/**
 * Tap outside a text field to hide the on-screen keyboard (iOS/Android).
 *
 * On web this renders its child unwrapped: there is no on-screen keyboard,
 * and react-native-web's Keyboard.dismiss() blurs the focused input. Clicking
 * a TextInput inside the wrapper would bubble up and blur it immediately, so
 * nothing could be typed. (It also avoids react-native-web's
 * TouchableWithoutFeedback reading element.ref, which React 19 warns about.)
 */
export default function DismissKeyboard({ children }: { children: ReactElement }) {
  if (Platform.OS === "web") {
    return children;
  }
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}

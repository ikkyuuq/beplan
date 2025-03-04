import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

// ====================== Type Definitions ======================
interface SignButtonProps {
  onPress: () => void;
  buttonText: string;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
}

// ====================== Main Component ======================
const SignButton: React.FC<SignButtonProps> = ({
  onPress,
  buttonText,
  buttonStyle,
  textStyle,
}) => {
  // ====================== Render UI ======================
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, buttonStyle]}>
      <Text style={[styles.text, textStyle]}>{buttonText}</Text>
    </TouchableOpacity>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Button Styles
  button: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },

  // Text Styles
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SignButton;

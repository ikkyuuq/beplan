import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ====================== Type Definitions ======================
interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

// ====================== Main Component ======================
export default function PasswordInput({
  placeholder,
  value,
  onChangeText,
}: PasswordInputProps) {
  // ====================== Render UI ======================
  return (
    <View style={styles.inputContainer}>
      <Ionicons
        name="lock-closed-outline"
        size={20}
        color="#333"
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#CCC"
        secureTextEntry
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Container Styles
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: "100%",
    marginBottom: 15,
  },

  // Icon Styles
  icon: {
    marginRight: 10,
  },

  // Input Styles
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});

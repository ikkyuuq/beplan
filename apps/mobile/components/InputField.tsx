import React from "react";
import { TextInput, View, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ====================== Type Definitions ======================
interface InputFieldProps extends TextInputProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
}

// ====================== Main Component ======================
const InputField: React.FC<InputFieldProps & { marginBottom?: number }> = ({
  iconName,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  marginBottom = 10,
  ...props
}) => {
  // ====================== Render UI ======================
  return (
    <View style={[styles.inputWrapper, { marginBottom }]}>
      {iconName && (
        <Ionicons
          name={iconName}
          size={30}
          color="#777"
          style={styles.inputIcon}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#bbbbbb"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        {...props}
      />
    </View>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Container Styles
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    width: "100%",
  },

  // Icon Styles
  inputIcon: {
    marginRight: 10,
  },

  // Input Styles
  input: {
    flex: 1,
  },
});

export default InputField;

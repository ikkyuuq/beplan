import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import { useRouter } from "expo-router";

// ====================== Type Definitions ======================
interface VerificationScreenProps {
  title?: string;
  description?: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  onVerifyPress: () => Promise<void>;
  errorMessage?: string | null;
  onResendPress: () => void;
}

// ====================== Main Component ======================
const VerificationScreen: React.FC<VerificationScreenProps> = ({
  title = "Verification Code",
  description = "Please enter the 6-digit verification code we sent via Email.",
  code,
  setCode,
  onVerifyPress,
  errorMessage,
  onResendPress,
}) => {
  // ====================== Navigation Hook ======================
  const router = useRouter();

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Title & Description */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Input Field */}
      <InputField
        placeholder="Enter verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
      />

      {/* Error Message */}
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {/* Verify Button */}
      <SignButton onPress={onVerifyPress} buttonText="Verify" />

      {/* Resend Link */}
      <TouchableOpacity onPress={onResendPress}>
        <Text style={styles.resendText}>Resend Verification Code</Text>
      </TouchableOpacity>
    </View>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F8F8",
  },

  // Typography
  title: {
    fontFamily: "InriaSerif_400Regular",
    fontSize: 60,
    fontWeight: "normal",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
  resendText: {
    marginTop: 15,
    textDecorationLine: "underline",
    color: "#333",
  },

  // Button Styles
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

export default VerificationScreen;

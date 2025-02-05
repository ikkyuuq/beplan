import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import { useRouter } from "expo-router";

interface VerificationScreenProps {
  title?: string;
  description?: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  onVerifyPress: () => Promise<void>;
  errorMessage?: string | null;
  onResendPress: () => void;
}

const VerificationScreen: React.FC<VerificationScreenProps> = ({
  title = "Verification Code",
  description = "Please enter the 6-digit verification code we sent via Email.",
  code,
  setCode,
  onVerifyPress,
  errorMessage,
  onResendPress,
}) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <InputField
        placeholder="Enter verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
      />
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      <SignButton onPress={onVerifyPress} buttonText="Verify" />
      <TouchableOpacity onPress={onResendPress}>
        <Text style={styles.resendText}>Resend Verification Code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F8F8",
  },
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
  errorText: { color: "red", fontSize: 14, marginTop: 5 },
  resendText: {
    marginTop: 15,
    textDecorationLine: "underline",
    color: "#333",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

export default VerificationScreen;

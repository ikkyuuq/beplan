import React, { useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSignIn, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import PasswordInput from "@/components/PasswordInput";

// ====================== Authentication & Navigation Hooks ======================
export default function SetPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const { signOut } = useClerk();
  const router = useRouter();

  // ====================== State Hooks ======================
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // ====================== Helper Functions ======================
  const isValidPassword = (password: string) => password.length >= 8;

  // ====================== Password Reset Handler ======================
  const onSetPasswordPress = async () => {
    try {
      if (!isLoaded) return;

      if (!password.trim() || !confirmPassword.trim()) {
        setErrorMessage("Both fields are required.");
        return;
      }

      if (!isValidPassword(password)) {
        setErrorMessage("Password must be at least 8 characters long.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      setIsSettingPassword(true);
      await signOut();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await signIn.resetPassword({ password });
      await signOut();
      router.replace(routes.signIn);
      setIsSettingPassword(false);
    } catch (err: any) {
      setIsSettingPassword(false);
      setErrorMessage("Failed to reset password. Please try again.");
    }
  };

  // ====================== Render ======================
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Please enter your new password and confirm.
      </Text>

      <View style={styles.inputWrapper}>
        <PasswordInput
          placeholder="New password"
          value={password}
          onChangeText={setPassword}
        />
        <PasswordInput
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity style={styles.button} onPress={onSetPasswordPress}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      {isSettingPassword && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },

  // Typography
  title: {
    fontFamily: "InriaSerif_400Regular",
    fontSize: 60,
    fontWeight: "normal",
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },

  // Input
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },

  // Button
  button: {
    backgroundColor: "#000",
    paddingVertical: 16,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  // Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 999,
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig";
import PasswordInput from "@/components/PasswordInput";

export default function SetPasswordScreen() {
  const { isLoaded, signIn } = useSignIn();
  const { signOut } = useClerk();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const onSetPasswordPress = async () => {
    setErrorMessage("");

    if (!isLoaded) return;

    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMessage("Both fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      await signOut();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await signIn.resetPassword({ password });
      await signOut();
      router.replace(routes.signIn);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.errors?.[0]?.message ||
          "Failed to reset password. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset</Text>
      <Text style={styles.title}>Password</Text>
      <Text style={styles.subtitle}>
        Please enter your new password and confirm.
      </Text>

      <Text style={styles.label}>New password</Text>
      <PasswordInput
        placeholder="************"
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Confirm new password</Text>
      <PasswordInput
        placeholder="************"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      <TouchableOpacity style={styles.button} onPress={onSetPasswordPress}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 60,
    fontFamily: "InriaSerif_400Regular",
    fontWeight: "bold",
    textAlign: "center",
    color: "#2D4A2E",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 5,
    color: "#2D4A2E",
  },
  button: {
    backgroundColor: "#2D4A2E",
    paddingVertical: 16,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
});

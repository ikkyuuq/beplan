import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { InriaSerif_400Regular } from "@expo-google-fonts/inria-serif";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";
import { routes } from "@/routesConfig";

export default function ResetPasswordScreen() {
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [fontsLoaded, loadError] = useFonts({
    InriaSerif_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D4A2E" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading fonts</Text>
      </View>
    );
  }

  const onResetPress = async () => {
    setErrorMessage("");
    if (!isLoaded) return;
    if (!emailAddress.trim()) {
      setErrorMessage("Email address cannot be empty.");
      return;
    }

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.errors?.[0]?.message ||
          "Failed to send reset link. Please try again."
      );
    } 
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const verifyAttempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (verifyAttempt.status === "needs_new_password") {
        console.log(
          "Verification successful! Redirecting to set new password..."
        );
        router.replace(routes.setNewPassword);
      } else {
        console.error(
          "Unexpected response:",
          JSON.stringify(verifyAttempt, null, 2)
        );
        setErrorMessage("Unexpected error occurred. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      setErrorMessage("Verification failed. Please try again.");
    }
  };

  if (pendingVerification) {
    return (
      <VerificationScreen
        title="Verification Code"
        description="Please enter the 6-digit verification code sent to your email."
        code={code}
        setCode={setCode}
        onVerifyPress={onVerifyPress}
        errorMessage={errorMessage}
        onResendPress={() => {
          console.log("Resend Code");
          Alert.alert(
            "Verification Code",
            "We have resent the verification code to your email.",
            [{ text: "OK" }]
          );
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.title}>Forgot your password?</Text>
      <Text style={styles.description}>
        Don’t worry. Just fill in your email and we’ll send you a link to reset
        your password.
      </Text>
      <Text style={styles.label}>Recovery Email Address</Text>
      <InputField
        iconName="mail-outline"
        placeholder="example@example.com"
        value={emailAddress}
        onChangeText={setEmailAddress}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      <SignButton onPress={onResetPress} buttonText="Send Reset Link" />
    </View>
  );
}

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
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 5,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

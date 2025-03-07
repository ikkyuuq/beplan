import React, { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from "react-native-reanimated";

// ====================== Main Component ======================
export default function ResetPasswordScreen() {
  // ====================== Animation Values ======================
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const descriptionOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(15);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 600 });
    titleTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Description animation
    descriptionOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));

    // Form animation
    formOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    // Button animation
    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    buttonTranslateY.value = withDelay(
      800,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  // ====================== Animated Styles ======================
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // ====================== Hooks & State ======================
  const { isLoaded, signIn } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ====================== Handlers ======================
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
    } catch (err: any) {
      setErrorMessage("Verification failed. Please try again.");
    }
  };

  // ====================== Render Verification Screen ======================
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
        emailAddress={emailAddress}
      />
    );
  }

  // ====================== Render Reset Password Form ======================
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Title & Description */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        Forgot your password?
      </Animated.Text>

      <Animated.Text style={[styles.description, descriptionAnimatedStyle]}>
        Don't worry. Just fill in your email and we'll send you a link to reset
        your password.
      </Animated.Text>

      {/* Email Input */}
      <Animated.View style={[formAnimatedStyle, { width: "100%" }]}>
        <Text style={styles.label}>Recovery Email Address</Text>
        <InputField
          iconName="mail-outline"
          placeholder="example@example.com"
          value={emailAddress}
          onChangeText={setEmailAddress}
        />

        {/* Error Message */}
        {errorMessage ? (
          <Animated.Text
            entering={FadeIn.duration(300)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        ) : null}
      </Animated.View>

      {/* Send Reset Link Button */}
      <Animated.View style={[buttonAnimatedStyle, { width: "100%" }]}>
        <SignButton onPress={onResetPress} buttonText="Send Reset Link" />
      </Animated.View>
    </View>
  );
}

// Styles
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
    color: "#2D4A2E",
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

  // Button
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },

  // Loading/Error States
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

import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn, useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import PasswordInput from "@/components/PasswordInput";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from "react-native-reanimated";

// ====================== Main Component ======================
export default function SetPasswordScreen() {
  // ====================== Animation Values ======================
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
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

    // Subtitle animation
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

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

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // ====================== Authentication & Navigation Hooks ======================
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();

  // ====================== State Management ======================
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);

  // ====================== Helper Functions ======================
  const calculatePasswordStrength = (
    password: string
  ): "weak" | "medium" | "strong" => {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    if (/[A-Z]/.test(password)) score += 1; // Uppercase
    if (/[a-z]/.test(password)) score += 1; // Lowercase
    if (/[0-9]/.test(password)) score += 1; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Special characters

    if (score < 3) return "weak";
    if (score < 5) return "medium";
    return "strong";
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const validatePasswords = (): boolean => {
    setErrorMessage("");

    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMessage("Both fields are required.");
      return false;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return false;
    }

    if (passwordStrength === "weak") {
      setErrorMessage(
        "Please create a stronger password with uppercase, lowercase, numbers, and special characters."
      );
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return false;
    }

    return true;
  };

  // ====================== Password Reset Handler ======================
  const onSetPasswordPress = async () => {
    try {
      if (!isLoaded) return;

      if (!validatePasswords()) return;

      setIsProcessing(true);

      await signIn.resetPassword({ password });

      Alert.alert(
        "Password Reset Complete",
        "Your password has been successfully reset. Please sign in with your new password.",
        [
          {
            text: "OK",
            onPress: () => router.replace(routes.signIn),
          },
        ]
      );
    } catch (err: any) {
      console.error("Password reset error:", err);

      if (err.errors && err.errors.length > 0) {
        setErrorMessage(err.errors[0].message);
      } else {
        setErrorMessage("Failed to reset password. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Title & Subtitle */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        Reset Password
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
        Please enter your new password and confirm.
      </Animated.Text>

      {/* Input Fields */}
      <Animated.View
        style={[styles.inputWrapper, formAnimatedStyle, { width: "100%" }]}
      >
        <PasswordInput
          placeholder="New password"
          value={password}
          onChangeText={setPassword}
        />

        {/* Password Strength Indicator */}
        {passwordStrength && (
          <View style={styles.strengthContainer}>
            <Text style={styles.strengthLabel}>Password Strength:</Text>
            <View style={styles.strengthBarContainer}>
              <View
                style={[
                  styles.strengthBar,
                  passwordStrength === "weak"
                    ? styles.weakBar
                    : passwordStrength === "medium"
                    ? styles.mediumBar
                    : styles.strongBar,
                ]}
              />
            </View>
            <Text
              style={[
                styles.strengthText,
                passwordStrength === "weak"
                  ? styles.weakText
                  : passwordStrength === "medium"
                  ? styles.mediumText
                  : styles.strongText,
              ]}
            >
              {passwordStrength.charAt(0).toUpperCase() +
                passwordStrength.slice(1)}
            </Text>
          </View>
        )}

        <PasswordInput
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {errorMessage && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Continue Button */}
      <Animated.View style={buttonAnimatedStyle}>
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.disabledButton]}
          onPress={onSetPasswordPress}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? "Processing..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Loading Overlay */}
      {isProcessing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
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
    marginTop: 10,
  },

  // Input Fields
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },

  // Password Strength
  strengthContainer: {
    marginVertical: 12,
    alignItems: "center",
  },
  strengthLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },
  strengthBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 6,
  },
  strengthBar: {
    height: "100%",
    borderRadius: 3,
    width: "33.33%",
  },
  weakBar: {
    backgroundColor: "#FF5252",
    width: "33.33%",
  },
  mediumBar: {
    backgroundColor: "#FFD740",
    width: "66.66%",
  },
  strongBar: {
    backgroundColor: "#4CAF50",
    width: "100%",
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  weakText: {
    color: "#FF5252",
  },
  mediumText: {
    color: "#FFD740",
  },
  strongText: {
    color: "#4CAF50",
  },

  // Button
  button: {
    backgroundColor: "#000",
    paddingVertical: 16,
    width: 200,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#CCC",
    opacity: 0.7,
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

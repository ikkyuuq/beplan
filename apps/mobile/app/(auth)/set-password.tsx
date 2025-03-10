import React, { useState, useEffect } from "react";
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
  const { signOut } = useClerk();
  const router = useRouter();

  // ====================== State Management ======================
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // ====================== Enhanced Password Validation ======================
  const isValidPassword = (password: string): boolean => {
    // At least 8 characters long
    if (password.length < 8) return false;

    // At least one number
    if (!/\d/.test(password)) return false;

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) return false;

    return true;
  };

  // ====================== Password Reset Handler ======================
  const onSetPasswordPress = async () => {
    try {
      if (!isLoaded) return;

      if (!password.trim() || !confirmPassword.trim()) {
        setErrorMessage("Both fields are required.");
        return;
      }

      if (!isValidPassword(password)) {
        setErrorMessage(
          "Password must be at least 8 characters long and include uppercase, lowercase, and numbers."
        );
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

      {/* Password Requirements */}
      <Animated.View style={[styles.requirementsContainer, formAnimatedStyle]}>
        <Text style={styles.requirementsTitle}>Your password must:</Text>
        <Text style={styles.requirementText}>
          • Be at least 8 characters long
        </Text>
        <Text style={styles.requirementText}>
          • Include at least one uppercase letter
        </Text>
        <Text style={styles.requirementText}>
          • Include at least one lowercase letter
        </Text>
        <Text style={styles.requirementText}>
          • Include at least one number
        </Text>
      </Animated.View>

      {/* Input Fields */}
      <Animated.View
        style={[styles.inputWrapper, formAnimatedStyle, { width: "100%" }]}
      >
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
        <TouchableOpacity style={styles.button} onPress={onSetPasswordPress}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Loading Overlay */}
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
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    color: "red",
    textAlign: "center",
    marginTop: 5,
  },

  // Password Requirements Container
  requirementsContainer: {
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  requirementsTitle: {
    fontWeight: "600",
    marginBottom: 5,
    color: "#1E40AF",
  },
  requirementText: {
    fontSize: 14,
    color: "#4B5563",
    marginVertical: 2,
  },

  // Input Fields
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
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

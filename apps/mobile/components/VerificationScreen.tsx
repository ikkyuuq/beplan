import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from "react-native-reanimated";

// ====================== Type Definitions ======================
interface VerificationScreenProps {
  title?: string;
  description?: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  onVerifyPress: () => Promise<void>;
  errorMessage?: string | null;
  onResendPress: () => void;
  emailAddress: string;
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
  emailAddress,
}) => {
  // ====================== Animation Values ======================
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const descriptionOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const resendOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 500 });
    titleTranslateY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });

    // Description animation
    descriptionOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Form animation
    formOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));

    // Button and resend link animation
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    resendOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
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
  }));

  const resendAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resendOpacity.value,
  }));

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
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        {title}
      </Animated.Text>

      <Animated.Text style={[styles.description, descriptionAnimatedStyle]}>
        {description}
      </Animated.Text>

      {/* Email Display */}
      <Animated.View
        style={[styles.emailContainer, descriptionAnimatedStyle]}
        entering={FadeIn.delay(400).duration(300)}
      >
        <Text style={styles.emailLabel}>Verification code sent to:</Text>
        <Text style={styles.emailValue}>{emailAddress}</Text>
      </Animated.View>

      {/* Input Field */}
      <Animated.View style={[{ width: "100%" }, formAnimatedStyle]}>
        <InputField
          placeholder="Enter verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
        />

        {/* Error Message */}
        {errorMessage && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Verify Button */}
      <Animated.View style={[{ width: "100%" }, buttonAnimatedStyle]}>
        <SignButton onPress={onVerifyPress} buttonText="Verify" />
      </Animated.View>

      {/* Resend Link */}
      <Animated.View style={resendAnimatedStyle}>
        <TouchableOpacity onPress={onResendPress}>
          <Text style={styles.resendText}>Resend Verification Code</Text>
        </TouchableOpacity>
      </Animated.View>
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
    alignSelf: "center",
  },
  resendText: {
    marginTop: 15,
    textDecorationLine: "underline",
    color: "#333",
  },

  // Email Display Styles
  emailContainer: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    marginBottom: 20,
    alignItems: "center",
  },
  emailLabel: {
    fontSize: 14,
    color: "#666",
  },
  emailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4E5A94",
    marginTop: 4,
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

import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import { useTranslation } from "@/i18n";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface VerificationScreenProps {
  title?: string;
  description?: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  onVerifyPress: () => Promise<void>;
  errorMessage?: string | null;
  setErrorMessage?: React.Dispatch<React.SetStateAction<string>>;
  onResendPress: () => Promise<void>;
  emailAddress: string;
  isResending?: boolean;
}

export default function VerificationScreen({
  title,
  description,
  code,
  setCode,
  onVerifyPress,
  errorMessage,
  setErrorMessage,
  onResendPress,
  emailAddress,
  isResending = false,
}: VerificationScreenProps) {
  // Animation Values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const descriptionOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const resendOpacity = useSharedValue(0);

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

  // Animated Styles
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

  const router = useRouter();
  const { t } = useTranslation();
  const AnimatedText = Animated.Text as any;
  const AnimatedView = Animated.View as any;

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Title & Description */}
      <AnimatedText style={[styles.title, titleAnimatedStyle]}>
        {title ?? t("auth.verifyTitle")}
      </AnimatedText>
      <AnimatedText style={[styles.description, descriptionAnimatedStyle]}>
        {description ?? t("auth.verifyDescription")}
      </AnimatedText>

      {/* Email Display */}
      <AnimatedView style={styles.emailContainer}>
        <Text style={styles.emailLabel}>{t("auth.codeSentTo")}</Text>
        <Text style={styles.emailValue}>{emailAddress}</Text>
      </AnimatedView>

      {/* Input Field */}
      <AnimatedView style={[{ width: "100%" }, formAnimatedStyle]}>
        <InputField
          placeholder={t("auth.codePlaceholder")}
          value={code}
          onChangeText={(text) => {
            setCode(text);
            if (setErrorMessage) setErrorMessage("");
          }}
          keyboardType="numeric"
        />

        {/* Error Message */}
        {!!errorMessage && (
          <Animated.Text style={styles.errorText}>{errorMessage}</Animated.Text>
        )}
      </AnimatedView>

      {/* Verify Button */}
      <Animated.View style={[{ width: "100%" }, buttonAnimatedStyle]}>
        <SignButton onPress={onVerifyPress} buttonText={t("auth.verify")} />
      </Animated.View>

      {/* Resend Link */}
      <Animated.View style={resendAnimatedStyle}>
        <TouchableOpacity
          onPress={onResendPress}
          disabled={isResending}
          style={
            isResending ? styles.resendButtonDisabled : styles.resendButton
          }
        >
          {isResending ? (
            <View style={styles.resendingContainer}>
              <ActivityIndicator size="small" color="#4E5A94" />
              <Text style={styles.resendingText}>{t("auth.sending")}</Text>
            </View>
          ) : (
            <Text style={styles.resendText}>{t("auth.resendCode")}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

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
    textAlign: "center",
    marginBottom: 10,
  },

  // Resend Link Styles
  resendText: {
    textDecorationLine: "underline",
    color: "#333",
    fontSize: 15,
  },
  resendingText: {
    color: "#777",
    fontSize: 15,
    marginLeft: 8,
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
  resendButton: {
    marginTop: 15,
    padding: 8,
  },
  resendButtonDisabled: {
    marginTop: 15,
    padding: 8,
  },
  resendingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});

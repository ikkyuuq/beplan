import React, { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { Alert } from "@/utils/alert";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";
import { useTranslation } from "@/i18n";
import { useScreenTopPadding } from "@/constants/layout";
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
  const topPadding = useScreenTopPadding(20);
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
  const { t } = useTranslation();
  const [emailAddress, setEmailAddress] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  // ====================== Handlers ======================
  const onResetPress = async () => {
    setErrorMessage("");

    if (!isLoaded) return;

    if (!emailAddress.trim()) {
      setErrorMessage(t("auth.emailEmpty"));
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
          t("auth.resetLinkFailed")
      );
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    if (!code.trim()) {
      setErrorMessage(t("auth.enterCode"));
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMessage(t("auth.invalidCode"));
      return;
    }

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
        setErrorMessage(t("auth.unexpectedError"));
      }
    } catch (err: any) {
      setErrorMessage(t("auth.verificationFailed"));
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);

      if (!isLoaded) return;

      // Resend verification code
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });

      console.log("Resend Code");
      Alert.alert(
        t("auth.verifyTitle"),
        t("auth.codeResentShort"),
        [{ text: t("common.ok") }]
      );

      return Promise.resolve();
    } catch (err) {
      console.error("Failed to resend code:", err);
      Alert.alert(
        t("common.error"),
        t("auth.resendFailed")
      );
      return Promise.reject(err);
    } finally {
      setIsResending(false);
    }
  };

  // ====================== Render Verification Screen ======================
  if (pendingVerification) {
    return (
      <VerificationScreen
        title={t("auth.verifyTitle")}
        description={t("auth.verifyDescription")}
        code={code}
        setCode={setCode}
        onVerifyPress={onVerifyPress}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        onResendPress={handleResendCode}
        emailAddress={emailAddress}
        isResending={isResending}
      />
    );
  }

  // ====================== Render Reset Password Form ======================
  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Title & Description */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        {t("auth.forgotTitle")}
      </Animated.Text>

      <Animated.Text style={[styles.description, descriptionAnimatedStyle]}>
        {t("auth.forgotDescription")}
      </Animated.Text>

      {/* Email Input */}
      <Animated.View style={[formAnimatedStyle, { width: "100%" }]}>
        <Text style={styles.label}>{t("auth.recoveryEmail")}</Text>
        <InputField
          iconName="mail-outline"
          placeholder="example@example.com"
          value={emailAddress}
          onChangeText={(text) => {
            setEmailAddress(text);
            setErrorMessage("");
          }}
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
        <SignButton onPress={onResetPress} buttonText={t("auth.sendResetLink")} />
      </Animated.View>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F8F8F8",
  },

  // Typography
  title: {
    fontFamily: "InriaSerif_400Regular",
    fontSize: 60,
    fontWeight: "normal",
    textAlign: "center",
    marginTop: 180,
    color: "#2D4A2E",
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    alignSelf: "center",
    marginBottom: 10,
  },

  // Button
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

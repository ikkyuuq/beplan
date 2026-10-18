import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Alert } from "@/utils/alert";
import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";
import { useTranslation } from "@/i18n";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";

// ====================== Main Component ======================
export default function SignUpScreen() {
  // ====================== Animation Values ======================
  const titleOpacity = useSharedValue(0);
  const dividerWidth = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 500 });

    // Divider animation
    dividerWidth.value = withDelay(
      300,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Form animation
    formOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    // Button animation
    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    buttonTranslateY.value = withDelay(
      800,
      withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  // ====================== Animated Styles ======================
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const dividerAnimatedStyle = useAnimatedStyle(() => ({
    width: `${80 * dividerWidth.value}%`,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // ====================== Authentication & Navigation Hooks ======================
  const { signUp, isLoaded } = useSignUp();
  const { signOut } = useClerk();
  const router = useRouter();
  const { t } = useTranslation();

  // ====================== State Management ======================
  const [username, setUsername] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isResendingCode, setIsResendingCode] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  // ====================== Helper Functions ======================
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const isValidUsername = (username: string): boolean => {
    // Username must be 3-20 characters and contain only letters, numbers, and underscores
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  };

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

  const validateForm = (): boolean => {
    setErrorMessage("");

    if (
      !username.trim() ||
      !emailAddress.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setErrorMessage(t("auth.allRequired"));
      return false;
    }

    if (!isValidEmail(emailAddress)) {
      setErrorMessage(t("auth.invalidEmail"));
      return false;
    }

    if (!isValidUsername(username)) {
      setErrorMessage(t("auth.usernameRule"));
      return false;
    }

    if (!isValidPassword(password)) {
      setErrorMessage(t("auth.passwordRule"));
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("auth.passwordsDontMatch"));
      return false;
    }

    return true;
  };

  // ====================== Sign-Up Handler ======================
  const onSignUpPress = async () => {
    try {
      if (!isLoaded) return;

      if (!validateForm()) return;

      setIsSigningUp(true);

      // Create the user account
      await signUp.create({
        emailAddress,
        password,
        username,
      });

      // Prepare verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign-up error:", err);

      if (err.errors && err.errors.length > 0) {
        setErrorMessage(err.errors[0].message);
      } else if (err.code == "clerk_identifier_taken") {
        setErrorMessage(t("auth.emailTaken"));
      } else {
        setErrorMessage(t("auth.signUpFailed"));
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  // ====================== Verification Handler ======================
  const onVerifyPress = async () => {
    try {
      if (!isLoaded) return;

      if (!code.trim()) {
        setErrorMessage(t("auth.enterCode"));
        return;
      }

      if (!/^\d{6}$/.test(code)) {
        setErrorMessage(t("auth.invalidCode"));
        return;
      }

      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        setIsSigningOut(true);
        try {
          await signOut();
        } catch (err) {
          console.error("Sign out error:", err);
        }
        setIsSigningOut(false);

        Alert.alert(
          t("auth.accountCreatedTitle"),
          t("auth.accountCreatedMessage"),
          [
            {
              text: t("common.ok"),
              onPress: () => router.replace(routes.signIn),
            },
          ]
        );
      } else {
        setErrorMessage(t("auth.verificationIncomplete"));
      }
    } catch (err: any) {
      console.error("Verification error:", err);

      if (err.errors && err.errors.length > 0) {
        setErrorMessage(err.errors[0].message);
      } else {
        setErrorMessage(t("auth.verificationFailed"));
      }
    }
  };

  // ====================== Resend Code Handler ======================
  const handleResendCode = async () => {
    try {
      if (!isLoaded) return;

      setIsResendingCode(true);

      // Resend verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      Alert.alert(
        t("auth.codeResentTitle"),
        t("auth.codeResentMessage"),
        [{ text: t("common.ok") }]
      );
    } catch (err: any) {
      console.error("Failed to resend verification code:", err);

      Alert.alert(
        t("common.error"),
        t("auth.resendFailed")
      );
    } finally {
      setIsResendingCode(false);
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
        onResendPress={handleResendCode}
        isResending={isResendingCode}
        emailAddress={emailAddress}
      />
    );
  }

  // ====================== Render Sign-Up Form ======================
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Title and Divider */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        {t("auth.register")}
      </Animated.Text>
      <Animated.View style={[styles.divider, dividerAnimatedStyle]} />

      {/* Input Fields with Animation */}
      <Animated.View style={[formAnimatedStyle, { width: "100%" }]}>
        <InputField
          iconName="person-outline"
          placeholder={t("auth.usernamePlaceholder")}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setErrorMessage("");
          }}
          autoCapitalize="none"
        />
        <InputField
          iconName="mail-outline"
          placeholder="example@example.com"
          value={emailAddress}
          onChangeText={(text) => {
            setEmailAddress(text);
            setErrorMessage("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <InputField
          iconName="lock-closed-outline"
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorMessage("");
          }}
          secureTextEntry
        />
        <InputField
          iconName="lock-closed-outline"
          placeholder={t("auth.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setErrorMessage("");
          }}
          secureTextEntry
        />
        {/* Error Message */}
        {Boolean(errorMessage) && (
          <Animated.Text
            entering={FadeInDown.duration(300)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Sign-Up Button */}
      <Animated.View style={[{ width: "100%" }, buttonAnimatedStyle]}>
        <SignButton
          onPress={onSignUpPress}
          buttonText={t("auth.signUp")}
          buttonStyle={isSigningUp ? styles.disabledButton : undefined}
        />
      </Animated.View>

      {/* Loading Indicator */}
      {(isSigningUp || isSigningOut) && (
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
    backgroundColor: "#F8F8F8",
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

  // Typography
  title: {
    fontFamily: "InriaSerif_400Regular",
    fontSize: 60,
    fontWeight: "bold",
    marginBottom: 20,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 10,
    textAlign: "center",
  },

  // Separator/Divider
  divider: {
    height: 2,
    backgroundColor: "#000",
    marginBottom: 40,
  },

  // Buttons
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  disabledButton: {
    backgroundColor: "#CCC",
    opacity: 0.7,
  },
});

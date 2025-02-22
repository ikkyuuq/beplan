import React from "react";
import {
  Text,
  View,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";

// ====================== Main Component ======================
export default function SignUpScreen() {
  // ====================== Authentication & Navigation Hooks ======================
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  // ====================== State Management ======================
  const [name, setName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSigningUp, setIsSigningUp] = React.useState(false);

  // ====================== Helper Functions ======================
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ====================== Sign-Up Handler ======================
  const onSignUpPress = async () => {
    try {
      if (!isLoaded) return;

      if (!name.trim() || !emailAddress.trim() || !password.trim()) {
        setErrorMessage("All fields are required.");
        return;
      }

      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Invalid email format.");
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      setIsSigningUp(true);

      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
      setIsSigningUp(false);
    } catch (err: any) {
      setIsSigningUp(false);
      if (err.code == "clerk_identifier_taken") {
        setErrorMessage("An account with this email already exists.");
      } else {
        setErrorMessage("Sign-up failed. Please try again.");
      }
    }
  };

  // ====================== Verification Handler ======================
  const onVerifyPress = async () => {
    try {
      if (!isLoaded) return;

      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace(routes.loggedInRedirect);
        setIsSigningUp(false);
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
          Alert.alert(
            "Verification Code",
            "We have resent the verification code to your email.",
            [{ text: "OK" }]
          );
        }}
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

      {/* Title and Input Fields */}
      <Text style={styles.title}>Register</Text>
      <View style={styles.divider} />
      <InputField
        iconName="person-outline"
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />
      <InputField
        iconName="mail-outline"
        placeholder="example@example.com"
        value={emailAddress}
        onChangeText={setEmailAddress}
      />
      <InputField
        iconName="lock-closed-outline"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <InputField
        iconName="lock-closed-outline"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {/* Error Message */}
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {/* Sign-Up Button */}
      <SignButton onPress={onSignUpPress} buttonText="Sign Up" />

      {/* Loading Indicator */}
      {isSigningUp && (
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
    marginTop: 5,
  },

  // Separator/Divider
  divider: {
    width: "80%",
    height: 2,
    backgroundColor: "#000",
    marginBottom: 80,
  },

  // Buttons
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

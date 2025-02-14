import * as React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { routes } from "@/routesConfig";
import { InriaSerif_400Regular } from "@expo-google-fonts/inria-serif";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";
import VerificationScreen from "@/components/VerificationScreen";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

  const [fontsLoaded, loadError] = useFonts({
    InriaSerif_400Regular,
  });

  const isValidEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSignUpPress = async () => {
    setErrorMessage("");
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

    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.errors?.[0]?.message || "Sign-up failed. Please try again."
      );
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace(routes.loggedInRedirect);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.errors?.[0]?.message || "Verification failed. Please try again."
      );
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
      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      <SignButton onPress={onSignUpPress} buttonText="Sign Up" />
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
    fontSize: 60,
    fontFamily: "InriaSerif_400Regular",
    fontWeight: "bold",
    marginBottom: 20,
  },
  title1: {
    fontSize: 65,
    fontFamily: "InriaSerif_400Regular",
    fontWeight: "bold",
  },
  errorText: { color: "red", fontSize: 14, marginTop: 5 },
  divider: {
    width: "80%",
    height: 2,
    backgroundColor: "#000",
    marginBottom: 80,
  },
  resendText: {
    marginTop: 15,
    textDecorationLine: "underline",
    color: "#333",
  },
  description: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

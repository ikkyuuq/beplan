import React from "react";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Button,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { InriaSerif_400Regular } from "@expo-google-fonts/inria-serif";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";

WebBrowser.maybeCompleteAuthSession();

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({
    strategy: "oauth_github",
  });

  const router = useRouter();

  const [fontsLoaded, loadError] = useFonts({
    InriaSerif_400Regular,
  });

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const onSignInPress = async () => {
    setErrorMessage("");
    if (!isLoaded) {
      console.error("Clerk is not loaded yet.");
      return;
    }
    if (!emailAddress.trim() || !password.trim()) {
      setErrorMessage("Email and password cannot be empty.");
      return;
    }
    if (!isValidEmail(emailAddress)) {
      setErrorMessage("Invalid email format. Please use a valid email.");
      return;
    }
    try {
      console.log("Trying to sign in with:", emailAddress);
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)/schedule");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.errors?.[0]?.message || "Sign-in failed. Please try again.",
      );
    }
  };

  const onGoogleSignInPress = async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleOAuth({
        redirectUrl: process.env.EXPO_PUBLIC_CLERK_REDIRECT_URL,
      });
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      } else {
        console.warn(
          "OAuth login did not return a session ID or setActive function.",
        );
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onGitHubSignInPress = async () => {
    try {
      const { createdSessionId, setActive } = await startGitHubOAuth({
        redirectUrl: Linking.createURL("/(tabs)/schedule", { scheme: "myapp" }),
      });

      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      } else {
        console.warn(
          "OAuth login did not return a session ID or setActive function.",
        );
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View style={styles.container}>
      {/* <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity> */}
      <Ionicons name="hammer" size={40} color="#222" style={styles.logo} />
      <Text style={styles.title}>Welcome back!</Text>
      <View style={styles.inputWrapper}>
        <InputField
          iconName="mail-outline"
          placeholder="example@example.com"
          value={emailAddress}
          onChangeText={setEmailAddress}
          marginBottom={15}
        />
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        <InputField
          iconName="lock-closed-outline"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          marginBottom={2}
        />
        <TouchableOpacity onPress={() => router.push("/(auth)/reset-password")}>
          <Text style={styles.forgotPassword}>Recovery Password</Text>
        </TouchableOpacity>
      </View>

      <SignButton onPress={onSignInPress} buttonText="Sign In" />
      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>Or continue with</Text>
        <View style={styles.separatorLine} />
      </View>

      <View style={styles.socialButtonsContainer}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={onGoogleSignInPress}
        >
          <Ionicons name="logo-google" size={40} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={onGitHubSignInPress}
        >
          <Ionicons name="logo-github" size={40} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.registerLink}>Register now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#F8F8F8",
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 15,
  },
  logo: { marginBottom: 10 },
  title: {
    fontFamily: "InriaSerif_400Regular",
    fontSize: 60,
    fontWeight: "normal",
    color: "#002402",
    textAlign: "left",
    lineHeight: 54,
    marginBottom: 30,
    marginTop: 30,
  },
  inputContainer: { width: "100%", marginTop: 20 },
  forgotPassword: {
    textAlign: "right",
    color: "#777",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 15,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#ccc" },
  separatorText: { marginHorizontal: 10, marginBottom: 15, color: "#43464a" },
  socialButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "center",
  },
  socialButton: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 15,
  },
  registerText: {
    fontSize: 14,
    color: "#43464a",
    textAlign: "center",
  },
  registerLink: {
    fontSize: 14,
    color: "#1E90FF",
    fontWeight: "bold",
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
});

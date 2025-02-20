import React, { useEffect } from "react";
import {
  Text,
  View,
  Platform,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import SignButton from "@/components/SignButton";
import InputField from "@/components/InputField";

// Preloads the browser for Android devices to reduce authentication load time
export const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "android") {
      void WebBrowser.warmUpAsync();
      return () => {
        void WebBrowser.coolDownAsync();
      };
    }
  }, []);
};

WebBrowser.maybeCompleteAuthSession(); // Handle any pending authentication sessions

// ====================== Authentication & Navigation Hooks ======================
export default function SignInScreen() {
  useWarmUpBrowser();

  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  // OAuth login handlers for Google & GitHub
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({
    strategy: "oauth_github",
  });

  const onGoogleSignInPress = async () =>
    handleOAuthSignIn(startGoogleOAuth, "Google");
  const onGitHubSignInPress = async () =>
    handleOAuthSignIn(startGitHubOAuth, "GitHub");

  // ====================== State Hooks ======================
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  // ====================== Helper Functions ======================
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // ====================== Sign-In Handlers ======================
  const onSignInPress = async () => {
    try {
      if (!isLoaded) return;

      if (!emailAddress.trim() || !password.trim()) {
        setErrorMessage("Email and password cannot be empty.");
        return;
      }

      if (!isValidEmail(emailAddress)) {
        setErrorMessage("Invalid email format. Please use a valid email.");
        return;
      }

      setIsSigningIn(true);

      // Attempt sign-in with provided credentials
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace(routes.loggedInRedirect);
        setIsSigningIn(false);
      } else {
        setErrorMessage("Sign-in is incomplete. Please try again.");
        setIsSigningIn(false);
      }
    } catch (err: any) {
      setErrorMessage("Sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  };

  // ====================== OAuth Handlers ======================
  const handleOAuthSignIn = async (startOAuthFlow: any, provider: string) => {
    try {
      if (!isLoaded) return;

      setIsSigningIn(true);

      const redirectUrl = Linking.createURL("/");
      const result = await startOAuthFlow({ redirectUrl });

      if (result?.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace(routes.loggedInRedirect);
        setIsSigningIn(false);
      } else {
        setErrorMessage(`${provider} Sign-in failed. Please try again.`);
        setIsSigningIn(false);
      }
    } catch (err: any) {
      setErrorMessage(`${provider} OAuth failed. Please check your settings.`);
      setIsSigningIn(false);
    }
  };

  // ====================== Render ======================
  return (
    <View style={styles.container}>
      <Ionicons name="hammer" size={40} color="#222" style={styles.logo} />
      <Text style={styles.title}>Welcome back!</Text>

      {/* ====================== Input Fields ====================== */}
      <View style={styles.inputWrapper}>
        {/* Email Input */}
        <InputField
          iconName="mail-outline"
          placeholder="example@example.com"
          value={emailAddress}
          onChangeText={setEmailAddress}
          marginBottom={15}
        />
        {/* Display Error Message if Exists */}
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {/* Password Input */}
        <InputField
          iconName="lock-closed-outline"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          marginBottom={2}
        />
        {/* Forgot Password Link */}
        <TouchableOpacity onPress={() => router.push(routes.resetPassword)}>
          <Text style={styles.forgotPassword}>Recovery Password</Text>
        </TouchableOpacity>
      </View>

      {/* ====================== Sign In Button ====================== */}
      <SignButton onPress={onSignInPress} buttonText="Sign In" />

      {/* ====================== Social Sign-In Section ====================== */}
      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>Or continue with</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* Social Sign-In Buttons */}
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

      {/* ====================== Register Section ====================== */}
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push(routes.signUp)}>
          <Text style={styles.registerLink}>Register now</Text>
        </TouchableOpacity>
      </View>

      {isSigningIn && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 20,
    backgroundColor: "#F8F8F8",
  },
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
    fontWeight: "normal",
    color: "#002402",
    textAlign: "left",
    lineHeight: 54,
    marginBottom: 30,
    marginTop: 30,
  },
  forgotPassword: {
    textAlign: "right",
    color: "#777",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 15,
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
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 15,
  },
  separatorText: {
    marginHorizontal: 10,
    marginBottom: 15,
    color: "#43464a",
  },

  // Input Fields
  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },

  // Separator
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },

  // Buttons
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

  // Register Section
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 15,
  },

  // Logo
  logo: {
    marginBottom: 10,
  },
});

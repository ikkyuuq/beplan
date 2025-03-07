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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

// ====================== Browser Warm-Up Utility ======================
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

// ====================== Main Component ======================
export default function SignInScreen() {
  // ====================== Animation Values ======================
  const logoOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const formOpacity = useSharedValue(0);

  // ใช้ translateY สำหรับปุ่มแทนการย่อขยาย
  const buttonTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);

  const socialButtonsOpacity = useSharedValue(0);

  // ====================== Animation Effects ======================
  useEffect(() => {
    // Logo animation - simplified
    logoOpacity.value = withTiming(1, { duration: 400 });

    // Title animation
    titleTranslateY.value = withDelay(
      200,
      withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Form animation
    formOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // Button animation
    buttonOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
    buttonTranslateY.value = withDelay(
      500,
      withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      })
    );

    socialButtonsOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 300 })
    );
  }, []);

  // ====================== Animated Styles ======================
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const socialButtonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: socialButtonsOpacity.value,
  }));

  // ====================== Authentication & Navigation Hooks ======================
  useWarmUpBrowser();
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
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

  // ====================== State Management ======================
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  // ====================== Helper Functions ======================)
  const isEmail = (text: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(text);
  };

  const handleIdentifierChange = (text: string) => {
    setIdentifier(text);
    if (
      errorMessage.toLowerCase().includes("email") ||
      errorMessage.toLowerCase().includes("username") ||
      errorMessage.toLowerCase().includes("empty")
    ) {
      setErrorMessage("");
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errorMessage.toLowerCase().includes("password")) {
      setErrorMessage("");
    }
  };

  // ====================== Sign-In Handlers ======================
  const onSignInPress = async () => {
    try {
      if (!isLoaded) return;

      if (!identifier.trim() || !password.trim()) {
        setErrorMessage("Email/Username and password cannot be empty.");
        return;
      }

      setIsSigningIn(true);

      const signInAttempt = await signIn.create({
        identifier,
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
      console.error("Sign-in error:", err);

      if (err.errors && err.errors.length > 0) {
        setErrorMessage(err.errors[0].message);
      } else {
        setErrorMessage("Sign-in failed. Please try again.");
      }

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

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Logo & Title */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Ionicons name="hammer" size={40} color="#222" />
      </Animated.View>

      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        Welcome back!
      </Animated.Text>

      {/* Input Fields */}
      <Animated.View style={[styles.inputWrapper, formAnimatedStyle]}>
        <Animated.View entering={FadeInDown.delay(450).duration(300)}>
          <InputField
            iconName="person-outline"
            placeholder="Email or Username"
            value={identifier}
            onChangeText={handleIdentifierChange}
            marginBottom={15}
          />
        </Animated.View>

        {errorMessage && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={styles.errorText}
          >
            {errorMessage}
          </Animated.Text>
        )}

        <Animated.View entering={FadeInDown.delay(550).duration(300)}>
          <InputField
            iconName="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            marginBottom={2}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(650).duration(250)}>
          <TouchableOpacity onPress={() => router.push(routes.resetPassword)}>
            <Text style={styles.forgotPassword}>Recovery Password</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Sign In Button */}
      <Animated.View style={[buttonAnimatedStyle, { width: "100%" }]}>
        <SignButton onPress={onSignInPress} buttonText="Sign In" />
      </Animated.View>

      {/* Social Sign-In Section */}
      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Animated.Text
          entering={FadeIn.delay(750).duration(250)}
          style={styles.separatorText}
        >
          Or continue with
        </Animated.Text>
        <View style={styles.separatorLine} />
      </View>

      <Animated.View
        style={[styles.socialButtonsContainer, socialButtonsAnimatedStyle]}
      >
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
      </Animated.View>

      {/* Register Section */}
      <Animated.View
        entering={FadeInUp.delay(850).duration(300)}
        style={styles.registerContainer}
      >
        <Text style={styles.registerText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push(routes.signUp)}>
          <Text style={styles.registerLink}>Register now</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Loading Overlay */}
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
  // Main Layout
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

  // Logo
  logoContainer: {
    alignSelf: "flex-start",
    marginBottom: 10,
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
    width: "100%",
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
});

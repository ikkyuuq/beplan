import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { routes } from "@/routesConfig";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";

// ====================== Main Component ======================
export default function WelcomeScreen() {
  // ====================== Animation Values ======================
  const titleOpacity = useSharedValue(0);
  const arrowTranslateX = useSharedValue(-30);
  const subtitleOpacity = useSharedValue(0);
  const dividerWidth = useSharedValue(0);
  const loginButtonOpacity = useSharedValue(0);
  const signupButtonOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 800 });

    // Arrow & subtitle animation
    arrowTranslateX.value = withDelay(
      400,
      withSequence(
        withTiming(5, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300 })
      )
    );
    subtitleOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));

    // Divider animation
    dividerWidth.value = withDelay(
      1100,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // Button animations
    loginButtonOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 400 })
    );
    signupButtonOpacity.value = withDelay(
      1600,
      withTiming(1, { duration: 400 })
    );
  }, []);

  // ====================== Animated Styles ======================
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowTranslateX.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const dividerAnimatedStyle = useAnimatedStyle(() => ({
    width: `${100 * dividerWidth.value}%`,
  }));

  const loginButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loginButtonOpacity.value,
  }));

  const signupButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: signupButtonOpacity.value,
  }));

  // ====================== Hooks ======================
  const router = useRouter();

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Title Animation */}
      <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
        {["Planning", "Just Got", "Easier!"].map((text, index) => (
          <Animated.Text
            key={index}
            entering={FadeIn.delay(200 * index).duration(600)}
            style={styles.title}
          >
            {text}
          </Animated.Text>
        ))}
      </Animated.View>

      {/* Subtitle with Arrow Animation */}
      <View style={styles.subtitleContainer}>
        <Animated.View style={arrowAnimatedStyle}>
          <FontAwesome name="long-arrow-right" size={50} color="black" />
        </Animated.View>
        <Animated.Text
          style={[styles.subtitle, subtitleAnimatedStyle, { marginLeft: 67 }]}
        >
          Streamline your goals anywhere, anytime with SMART task planning for
          success.
        </Animated.Text>
      </View>

      {/* Divider Animation */}
      <Animated.View style={[styles.divider, dividerAnimatedStyle]} />

      {/* Button Container */}
      <View style={styles.buttonContainer}>
        {/* Login Button */}
        <Animated.View style={loginButtonAnimatedStyle}>
          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={() => router.push(routes.signIn)}
          >
            <Text style={styles.buttonTextOutline}>LOG IN</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Sign Up Button */}
        <Animated.View style={signupButtonAnimatedStyle}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => router.push(routes.signUp)}
          >
            <Text style={styles.buttonTextPrimary}>OPEN AN ACCOUNT</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 30,
    backgroundColor: "#F5F5F5",
  },
  titleContainer: {
    marginTop: 15,
  },
  title: {
    fontSize: 60,
    fontWeight: "normal",
    color: "#2D4A2E",
    textAlign: "left",
    lineHeight: 60,
    fontFamily: "InriaSerif_400Regular",
  },
  subtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#AAA",
    marginVertical: 20,
    alignSelf: "stretch",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 10,
    gap: 12,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "#2D2D2D",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: "center",
  },
  buttonTextOutline: {
    color: "#2D2D2D",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonPrimary: {
    backgroundColor: "#2D4A2E",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 140,
    alignItems: "center",
  },
  buttonTextPrimary: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
  },
});

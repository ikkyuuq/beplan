import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { InriaSerif_400Regular } from "@expo-google-fonts/inria-serif";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function WelcomeScreen() {
  const router = useRouter();
  const [fontsLoaded, loadError] = useFonts({
    InriaSerif_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D4A2E" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading fonts</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        {["Planning", "Just Got", "Easier!"].map((text, index) => (
          <Text key={index} style={styles.title}>
            {text}
          </Text>
        ))}
      </View>

      <View style={styles.subtitleContainer}>
        <FontAwesome name="long-arrow-right" size={50} color="black" />
        <Text style={[styles.subtitle, { marginLeft: 67 }]}>
          Streamline your goals anywhere, anytime with SMART task planning for
          success.
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonOutline}
          onPress={() => router.push("/(auth)/sign-in")}
        >
          <Text style={styles.buttonTextOutline}>LOG IN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => router.push("/(auth)/sign-up")}
        >
          <Text style={styles.buttonTextPrimary}>OPEN AN ACCOUNT</Text>
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
    lineHeight: 54,
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
    width: "100%",
    height: 1,
    backgroundColor: "#AAA",
    marginVertical: 20,
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

import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { Stack } from "expo-router/stack";
import { tokenCache } from "@/cache";
import { ReactNode, useEffect, useState } from "react";
import { useProtectedRoute } from "@/middleware/useProtectedRoute";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, ActivityIndicator } from "react-native";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// ====================== Main Component ======================
export default function RootLayout() {
  // ====================== Font Loading State ======================
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState(false);

  // ====================== Environment Setup ======================
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // ====================== Environment Key Check ======================
  if (!publishableKey) {
    console.error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env");
    return null;
  }

  // ====================== Font Loading Effect ======================
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          InriaSerif_400Regular: require("../assets/fonts/InriaSerif-Regular.ttf"),
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn("Error loading fonts:", e);
        setFontError(true);
      } finally {
        // Hide the splash screen once fonts are loaded or if there's an error
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // Splash screen might already be hidden
          console.log("Splash screen already hidden");
        }
      }
    }

    loadFonts();
  }, []);

  // ====================== Loading State Handling ======================
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading fonts...</Text>
      </View>
    );
  }

  // ====================== Clerk Authentication & Routing ======================
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        {/* แก้ไข: เพิ่ม `isLoaded` เพื่อลดปัญหาการ Redirect ผิดพลาด */}
        <ProtectedRoutes>
          <Stack screenOptions={{ headerShown: false }} />
        </ProtectedRoutes>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

// ====================== Protected Routes Wrapper ======================
function ProtectedRoutes({ children }: { children: ReactNode }) {
  useProtectedRoute(); // Ensures authentication protection
  return children;
}

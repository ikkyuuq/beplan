import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { routes } from "@/routesConfig";

// Web only. Google/GitHub sign-in on web sends the whole page to the provider
// and back here (sign-in.tsx: signIn.authenticateWithRedirect). A popup can't
// be used: it opens after a request to Clerk, too late for browsers to treat it
// as a user click, so they block it. This page finishes the sign-in (or sign-up
// for a new account); the route guard then moves the signed-in user to Schedule.
export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    handleRedirectCallback({
      signInFallbackRedirectUrl: "/schedule",
      signUpFallbackRedirectUrl: "/schedule",
    }).catch((err: any) => {
      console.error("Social sign-in callback failed", err);
      setError(
        err?.errors?.[0]?.longMessage || err?.message || "Sign-in couldn't be completed."
      );
    });
  }, [handleRedirectCallback]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => router.replace(routes.signIn)}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.text}>Signing you in…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#000",
  },
  text: { color: "#fff", fontSize: 16 },
  error: { color: "#FF6B6B", fontSize: 16, textAlign: "center" },
  link: { color: "#60A5FA", fontSize: 16 },
});

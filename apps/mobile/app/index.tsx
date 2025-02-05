import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D4A2E" />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/Dashboard" : "/(welcome)"} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
});

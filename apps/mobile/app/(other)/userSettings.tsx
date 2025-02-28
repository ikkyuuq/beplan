import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useClerk } from "@clerk/clerk-expo";
import { routes } from "@/routesConfig";

// ====================== Main Component ======================
export default function UserSettings() {
  // ====================== Hooks ======================
  const router = useRouter();
  const { signOut } = useClerk();

  // ====================== Handlers ======================
  const handleBack = () => {
    router.back();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace(routes.signIn);
  };

  // ====================== Render UI ======================
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Empty Content Area */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Settings content will go here
        </Text>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Feather
          name="log-out"
          size={20}
          color="#fff"
          style={styles.signOutIcon}
        />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#16171F",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#16171F",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
  },

  // Sign Out Button
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  signOutIcon: {
    marginRight: 10,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

import { Feather, Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import { useState } from "react";

export default function Community() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    await signOut();
    router.replace(routes.signIn);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Feather name="menu" size={24} color="#fff" />
          <Pressable onPress={handleSignOut} style={styles.profileButton}>
            <Image
              source={{ uri: "https://picsum.photos/200/300" }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </Pressable>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Community</Text>
        </View>
        {/* ✅ Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#777"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Looking for something?"
            placeholderTextColor="#bbb"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    </View>
  );
}

/* ✅ Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
  },

  // Header Styles
  header: {
    height: 320,
    backgroundColor: "#16171F",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 10,
    shadowOpacity: 0.1,
    elevation: 5, // For Android shadow
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    alignItems: "center",
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 100,
  },

  // Title Styles
  titleContainer: {
    alignItems: "flex-start",
    borderRadius: 25,
    marginLeft: 20, // Consider if this is needed with marginLeft in title
    padding: 5,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: -20, // Consider if this is needed with marginLeft in titleContainer
  },

  // Search Bar Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff", // Consider if you want white text on a white background
  },
});

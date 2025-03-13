import React from "react";
import {
  View,
  ViewStyle,
  Pressable,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

// ====================== Type Definitions ======================
type HeaderProps = {
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
};

// ====================== Main Component ======================
export default function Header({ children, containerStyle }: HeaderProps) {
  // ====================== Hooks & Navigation ======================
  const router = useRouter();
  const { user } = useUser();

  const handleNavigateToSettings = () => {
    router.push("/userSettings");
  };

  const handleNavigateToAllgoalAlltask = () => {
    router.push("/AllGoalAllTask");
  };

  // ====================== User Profile Image ======================
  const profileImageUrl =
    user?.unsafeMetadata.profileImageUrl || user?.imageUrl || "";

  // ====================== Render UI ======================
  return (
    <View style={[styles.header, containerStyle]}>
      <View style={styles.headerContent}>
        <Feather
          name="menu"
          size={24}
          color="#fff"
          onPress={handleNavigateToAllgoalAlltask}
        />
        <Pressable
          onPress={handleNavigateToSettings}
          style={styles.profileButton}
        >
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Header Styles
  header: {
    height: 330,
    backgroundColor: "#16171F",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 10,
    shadowOpacity: 0.1,
    elevation: 5,
  },

  // Header Content Styles
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  // Profile Button Styles
  profileButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 100,
    overflow: "hidden",
  },
});

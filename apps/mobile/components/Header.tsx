import React from "react";
import {
  View,
  ViewStyle,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  // Real top safe area (notch / Dynamic Island / status bar) per device,
  // instead of a fixed 60 px on iOS.
  const insets = useSafeAreaInsets();

  const handleNavigateToSettings = () => {
    router.push("/userSettings");
  };

  const handleNavigateToAllgoalAlltask = () => {
    router.push("/AllGoalAllTask");
  };

  // ====================== User Profile Image ======================
  const metadataProfileImage = user?.unsafeMetadata?.profileImageUrl;
  const profileImageUrl =
    typeof metadataProfileImage === "string"
      ? metadataProfileImage
      : user?.imageUrl || "";

  // ====================== Render UI ======================
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }, containerStyle]}>
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
    // A minimum, not a fixed height: content (e.g. the schedule's week strip)
    // and larger accessibility text can make it taller without overlapping.
    minHeight: 330,
    backgroundColor: "#16171F",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
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

import React, { useEffect, useState } from "react";
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
import OccupationProfileIcon from "./OccupationProfileIcon";

// ====================== Type Definitions ======================
type HeaderProps = {
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
};

// ====================== Main Component ======================
export default function Header({ children, containerStyle }: HeaderProps) {
  // ====================== Hooks & Navigation ======================
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // ====================== State Management ======================
  const [useOccupationIcon, setUseOccupationIcon] = useState(false);
  const [occupation, setOccupation] = useState<string | null>(null);

  // ====================== Effects ======================
  useEffect(() => {
    if (isLoaded && user) {
      // Get user metadata for occupation and icon
      const occupationValue = user.unsafeMetadata?.occupation as string;
      const useOccupIcon = user.unsafeMetadata?.useOccupationIcon as boolean;

      setOccupation(occupationValue || null);
      setUseOccupationIcon(useOccupIcon || false);
    }
  }, [isLoaded, user]);

  // ====================== Handlers ======================
  const handleNavigateToSettings = () => {
    router.push("/userSettings");
  };

  // ====================== Helper Variables ======================
  const profileImageUrl = user?.imageUrl;

  // ====================== Render UI ======================
  return (
    <View style={[styles.header, containerStyle]}>
      <View style={styles.headerContent}>
        <Feather name="menu" size={24} color="#fff" />
        <Pressable
          onPress={handleNavigateToSettings}
          style={styles.profileButton}
        >
          {useOccupationIcon && occupation ? (
            <View style={styles.profileImage}>
              <OccupationProfileIcon
                occupation={occupation}
                size={35}
                showLabel={false}
              />
            </View>
          ) : (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          )}
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
    justifyContent: "center",
    alignItems: "center",
  },
});

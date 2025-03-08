import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View, ViewStyle, Pressable, StyleSheet, Image } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import OccupationProfileIcon from "./OccupationProfileIcon";

type HeaderProps = {
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
};

export default function Header({ children, containerStyle }: HeaderProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [useOccupationIcon, setUseOccupationIcon] = useState(false);
  const [occupation, setOccupation] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Get user metadata for occupation and icon preference
      const occupationValue = user.unsafeMetadata?.occupation as string;
      const useOccupIcon = user.unsafeMetadata?.useOccupationIcon as boolean;

      setOccupation(occupationValue || null);
      setUseOccupationIcon(useOccupIcon || false);
    }
  }, [isLoaded, user]);

  const handleNavigateToSettings = () => {
    router.push("/userSettings");
  };

  const profileImageUrl = user?.imageUrl;

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

const styles = StyleSheet.create({
  // Header Styles
  header: {
    height: 330,
    backgroundColor: "#16171F",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    paddingTop: 35,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 10,
    shadowOpacity: 0.1,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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

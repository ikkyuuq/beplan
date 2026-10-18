import React from "react";
import {
  View,
  ViewStyle,
  Pressable,
  StyleSheet,
  Image,
  Text,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";

// The scroll area below the header starts this much higher (marginTop: -HEADER_RADIUS)
// and pads its content back down, so content scrolls under the curved corners
// instead of being cut off in a straight line at the header's bottom edge.
export const HEADER_RADIUS = 30;

// The header fills at least this share of the screen height; extra space is
// spread around the content below the top row.
const HEADER_SCREEN_SHARE = 0.33;

// ====================== Type Definitions ======================
type HeaderProps = {
  // Shown in the top row between the menu and the avatar. A string gets the
  // standard title style; pass a node for custom content (e.g. a month switcher).
  title?: React.ReactNode;
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
};

// ====================== Main Component ======================
export default function Header({ title, children, containerStyle }: HeaderProps) {
  // ====================== Hooks & Navigation ======================
  const router = useRouter();
  const { user } = useUser();
  // Real top safe area (notch / Dynamic Island / status bar) per device,
  // instead of a fixed 60 px on iOS.
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

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
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          minHeight: Math.round(windowHeight * HEADER_SCREEN_SHARE),
        },
        containerStyle,
      ]}
    >
      <View style={styles.headerContent}>
        <Feather
          name="menu"
          size={24}
          color="#fff"
          onPress={handleNavigateToAllgoalAlltask}
        />
        <View style={styles.titleSlot}>
          {typeof title === "string" ? (
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {title}
            </Text>
          ) : (
            title
          )}
        </View>
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
      <View style={styles.body}>{children}</View>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Header Styles
  header: {
    // minHeight is set inline (HEADER_SCREEN_SHARE of the window); content
    // that needs more (e.g. large accessibility text) still makes it taller.
    backgroundColor: "#16171F",
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    // Drawn above the scroll area that slides under its corners.
    zIndex: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
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
    gap: 12,
  },
  body: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 12,
  },
  titleSlot: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
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

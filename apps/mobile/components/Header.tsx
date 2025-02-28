import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View, ViewStyle, Pressable, StyleSheet, Image } from "react-native";

type HeaderProps = {
  children?: React.ReactNode;
  containerStyle?: ViewStyle;
};

export default function Header({ children, containerStyle }: HeaderProps) {
  const router = useRouter();

  const handleNavigateToSettings = () => {
    router.push("/userSettings");
  };

  return (
    <View style={[styles.header, containerStyle]}>
      <View style={styles.headerContent}>
        <Feather name="menu" size={24} color="#fff" />
        <Pressable
          onPress={handleNavigateToSettings}
          style={styles.profileButton}
        >
          <Image
            source={{ uri: "https://picsum.photos/200/300" }}
            style={styles.profileImage}
            resizeMode="cover"
          />
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
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 100,
  },
});

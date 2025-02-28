import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import Animated from "react-native-reanimated";

type PreviewTemplateModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onAddToList: () => void;
  data: {
    isListed: boolean;
    title: string;
    category: string;
    image: string;
    description?: string;
    owner: string;
  };
};

export default function PreviewTemplateModal({
  isVisible,
  onClose,
  onAddToList,
  data,
}: PreviewTemplateModalProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Modal
        presentationStyle="overFullScreen"
        transparent
        animationType="slide"
        visible={isVisible}
        onRequestClose={onClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Animated.View style={[styles.previewContainer]}>
              <Image source={{ uri: data.image }} style={styles.previewImage} />
              <LinearGradient
                colors={[
                  "transparent",
                  "transparent",
                  "transparent",
                  "#1a1a1a",
                ]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "50%",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    zIndex: 1,
                  }}
                >
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => {
                      onAddToList();
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={92}
                      style={{
                        color: data.isListed ? "lightgreen" : "#e3e3e3",
                      }}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "black",
                      padding: 12,
                      borderBottomLeftRadius: 10,
                      borderBottomRightRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="crown-circle"
                      size={24}
                      color={data.owner != "BePlan" ? "silver" : "gold"}
                    />
                    <Text style={{ color: "white" }}>{data.owner}</Text>
                  </View>
                </View>
              </LinearGradient>
              <ScrollView>
                <View style={styles.previewTextContainer}>
                  <Text style={styles.previewCategory}>{data.category}</Text>
                  <Text style={styles.previewTitle}>{data.title}</Text>
                  <Text style={styles.previewDescription}>
                    {data.description}
                  </Text>
                </View>
              </ScrollView>
            </Animated.View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    height: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    overflow: "hidden",
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    width: "100%",
    height: "50%",
  },
  previewTextContainer: {
    padding: 20,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  previewCategory: {
    fontSize: 14,
    color: "gray",
  },
  previewDescription: {
    fontSize: 16,
    color: "black",
    fontWeight: "300",
  },
  closeButton: {
    backgroundColor: "black",
    padding: 16,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import Modal from "react-native-modal";
import { Template } from "@/types/templateTypes";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type TemplateModalProps = {
  visible: boolean;
  template: Template | null;
  onClose: () => void;
  onSelect: () => void;
  goals: { id: string; title: string }[];
};

export default function TemplateModal({
  visible,
  template,
  onClose,
  onSelect,
  goals,
}: TemplateModalProps) {
  const [isModalVisible, setIsModalVisible] = useState(visible);
  const [activeTab, setActiveTab] = useState<"description" | "goals">(
    "description"
  );

  useEffect(() => {
    setIsModalVisible(visible);
  }, [visible]);

  const handleClose = () => {
    setIsModalVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSelect = () => {
    setIsModalVisible(false);
    setTimeout(onSelect, 300);
  };

  if (!template) return null;

  return (
    <View>
      <Modal
        isVisible={isModalVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={300}
        animationOutTiming={300}
        backdropTransitionInTiming={300}
        backdropTransitionOutTiming={300}
        useNativeDriver={true}
        onBackdropPress={handleClose}
        onBackButtonPress={handleClose}
        style={{ margin: 0 }}
      >
        <View style={styles.container}>
          {/* Hero Section with Image Overlay */}
          <View style={styles.heroContainer}>
            <Image source={{ uri: template.image }} style={styles.heroImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.gradient}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{template.title}</Text>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{template.category}</Text>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[
                styles.tab,
                activeTab === "description" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("description")}
            >
              <Ionicons
                name="book-outline"
                size={20}
                color={activeTab === "description" ? "#000" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "description" && styles.activeTabText,
                ]}
              >
                Description
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "goals" && styles.activeTab]}
              onPress={() => setActiveTab("goals")}
            >
              <Ionicons
                name="flag-outline"
                size={20}
                color={activeTab === "goals" ? "#000" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "goals" && styles.activeTabText,
                ]}
              >
                Goals
              </Text>
            </Pressable>
          </View>

          {/* Content Area */}
          <ScrollView
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "description" ? (
              <View style={styles.descriptionContent}>
                <Text style={styles.description}>{template.description}</Text>
              </View>
            ) : (
              <View style={styles.goalsContent}>
                {template.goals_id?.map((goalId, index) => {
                  // ✅ หา Goal ที่ตรงกับ goalId
                  const goal = goals.find((g) => g.id === goalId);

                  return (
                    <View key={goalId} style={styles.goalItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#32CD32"
                      />
                      <Text style={styles.goalText}>
                        {goal ? goal.title : `Unknown Goal ${index + 1}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close-circle" size={40} color="red" />
              <Text style={styles.closeText}>Close</Text>
            </Pressable>

            <Pressable style={styles.selectButton} onPress={handleSelect}>
              <Ionicons name="checkmark-circle" size={40} color="green" />
              <Text style={styles.selectText}>Select</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Hero Section
  heroContainer: {
    height: 250,
    width: "100%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    marginRight: 20,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "600",
  },

  // Content Area
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  descriptionContent: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  goalsContent: {
    paddingVertical: 20,
    gap: 15,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(50,205,50,0.1)",
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  goalText: {
    fontSize: 16,
    color: "#333",
  },

  // Action Buttons
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,99,71,0.1)",
    padding: 15,
    borderRadius: 10,
    flex: 1,
  },
  closeText: {
    marginLeft: 10,
    fontSize: 18,
    color: "red",
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(50,205,50,0.1)",
    padding: 15,
    borderRadius: 10,
    flex: 1,
  },
  selectText: {
    marginLeft: 10,
    fontSize: 18,
    color: "green",
  },
});

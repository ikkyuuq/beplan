import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import Modal from "react-native-modal";

// ====================== Type Definitions ======================
type TemplateModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onAddToList: () => void;
  data: {
    isListed: boolean;
    title: string;
    category: string;
    description?: string;
    image: string;
    owner: string;
    duration?: number;
    goals?: { id: string; title: string }[];
  };
};

// ====================== Helper Functions ======================
// Format duration to match TemplateCard
const formatDuration = (days?: number): string => {
  if (!days) return "";

  if (days >= 365) {
    return "1 Year";
  } else if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "Month" : "Months"}`;
  } else {
    return `${days} ${days === 1 ? "Day" : "Days"}`;
  }
};

// Get icon based on category to match TemplateCard
const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category.toLowerCase()) {
    case "fitness":
    case "workout":
      return "barbell-outline";
    case "health":
      return "fitness-outline";
    case "education":
      return "book-outline";
    case "work":
    case "finance":
      return "briefcase-outline";
    case "travel":
      return "airplane-outline";
    case "personal_development":
    case "productivity":
      return "person-outline";
    default:
      return "pricetag-outline";
  }
};

// ====================== Main Component ======================
export default function TemplateModal({
  isVisible,
  onClose,
  onAddToList,
  data,
}: TemplateModalProps) {
  // ====================== State Management ======================
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "goals">(
    "description"
  );

  // ====================== Handlers ======================
  // Handle select button with confirmation
  const handleSelect = () => {
    Alert.alert(
      "Confirm Selection",
      `Are you sure you want to select "${data.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            console.log(`Template selected: ${data.title}`);
            onAddToList();
            onClose();
          },
        },
      ]
    );
  };

  // ====================== Render UI ======================
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Modal
        isVisible={isVisible}
        onBackdropPress={onClose}
        onBackButtonPress={onClose}
        backdropTransitionOutTiming={0}
        animationIn="zoomIn"
        animationOut="zoomOut"
        animationInTiming={300}
        animationOutTiming={300}
        useNativeDriver={true}
        statusBarTranslucent
        style={styles.modalStyle}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.previewContainer}>
              {/* Hero Image Section */}
              <View style={styles.heroContainer}>
                <Image source={{ uri: data.image }} style={styles.heroImage} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.gradient}
                />

                {/* Owner Badge */}
                <View style={styles.ownerBadge}>
                  <MaterialCommunityIcons
                    name="crown-circle"
                    size={20}
                    color={data.owner !== "BePlan" ? "silver" : "gold"}
                  />
                  <Text style={styles.ownerText}>{data.owner}</Text>
                </View>

                {/* Hero Content */}
                <View style={styles.heroContent}>
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Ionicons
                      name={getCategoryIcon(data.category)}
                      size={14}
                      color="#FFF"
                      style={styles.categoryIcon}
                    />
                    <Text style={styles.categoryText}>
                      {data.category.charAt(0).toUpperCase() +
                        data.category.slice(1).replace("_", " ")}
                    </Text>
                  </View>

                  <Text style={styles.previewTitle}>{data.title}</Text>

                  {/* Duration Badge */}
                  {data.duration && (
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={12} color="#FFF" />
                      <Text style={styles.durationText}>
                        {formatDuration(data.duration)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                {/* Description Tab */}
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "description" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("description")}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={activeTab === "description" ? "#4E5A94" : "#888"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "description" && styles.activeTabText,
                    ]}
                  >
                    Description
                  </Text>
                </TouchableOpacity>

                {/* Goals Tab */}
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "goals" && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab("goals")}
                >
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={activeTab === "goals" ? "#4E5A94" : "#888"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "goals" && styles.activeTabText,
                    ]}
                  >
                    Goals
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Content Section */}
              <ScrollView style={styles.contentScroll}>
                <View style={styles.previewTextContainer}>
                  {/* Description Tab Content */}
                  {activeTab === "description" && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      style={styles.tabContent}
                    >
                      <View style={styles.descriptionContainer}>
                        <Text
                          style={styles.previewDescription}
                          numberOfLines={showFullDescription ? undefined : 6}
                        >
                          {data.description || "No description available."}
                        </Text>

                        {/* Show More/Less Button */}
                        {data.description && data.description.length > 150 && (
                          <TouchableOpacity
                            style={styles.showMoreButton}
                            onPress={() =>
                              setShowFullDescription(!showFullDescription)
                            }
                          >
                            <Text style={styles.showMoreText}>
                              {showFullDescription ? "Show Less" : "Show More"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Animated.View>
                  )}

                  {/* Goals Tab Content */}
                  {activeTab === "goals" && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      style={styles.tabContent}
                    >
                      {data.goals && data.goals.length > 0 ? (
                        <View style={styles.goalsList}>
                          {data.goals.map((goal) => (
                            <View key={goal.id} style={styles.goalItem}>
                              <Ionicons
                                name="flag-outline"
                                size={16}
                                color="#4E5A94"
                              />
                              <Text style={styles.goalText}>{goal.title}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyGoalsContainer}>
                          <Ionicons
                            name="information-circle-outline"
                            size={40}
                            color="#CCC"
                          />
                          <Text style={styles.emptyGoalsText}>
                            No goals associated with this template
                          </Text>
                        </View>
                      )}
                    </Animated.View>
                  )}
                </View>
              </ScrollView>

              {/* Footer Buttons */}
              <View style={styles.footerButtons}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={handleSelect}
                >
                  <Text style={styles.selectButtonText}>Select</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Modal Layout
  modalStyle: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "90%",
    backgroundColor: "transparent",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  previewContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  // Hero Section
  heroContainer: {
    height: 220,
    position: "relative",
    width: "100%",
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
    height: "70%",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Tab Navigation
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    position: "relative",
    backgroundColor: "#FFF",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#4E5A94",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4E5A94",
    fontWeight: "600",
  },
  tabContent: {
    paddingTop: 16,
  },

  // Badges
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
    gap: 5,
  },
  durationText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "500",
  },
  ownerBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ownerText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Content Section
  contentScroll: {
    flex: 1,
  },
  previewTextContainer: {
    padding: 20,
  },
  descriptionContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  previewDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
  },
  showMoreButton: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
  showMoreText: {
    color: "#4E5A94",
    fontWeight: "500",
    fontSize: 14,
  },

  // Goals Section
  goalsList: {
    gap: 8,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 90, 148, 0.1)",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  goalText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  emptyGoalsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    opacity: 0.7,
  },
  emptyGoalsText: {
    marginTop: 12,
    color: "#888",
    fontSize: 16,
  },

  // Footer Buttons
  footerButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  closeButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  selectButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#4E5A94",
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  FadeIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from "react-native-reanimated";
import Modal from "react-native-modal";

// ====================== Type Definitions ======================
type TemplateModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onAddToList: () => void;
  onToggleFavorite?: () => void;
  data: {
    isListed: boolean;
    isFavorite?: boolean;
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
// Format duration
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
  onToggleFavorite,
  data,
}: TemplateModalProps) {
  // ====================== State Management ======================
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "goals">("description");
  const [isFavorite, setIsFavorite] = useState(data.isFavorite || false);
  
  // ====================== Animation Values ======================
  const favoriteScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  
  // ====================== Animation Styles ======================
  const animatedFavoriteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));
  
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // ====================== Effects ======================
  useEffect(() => {
    setIsFavorite(data.isFavorite || false);
  }, [data.isFavorite]);

  // ====================== Event Handlers ======================
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    favoriteScale.value = withSpring(0.8, { damping: 10 }, () => {
      favoriteScale.value = withSpring(1, { damping: 10 });
    });
    
    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  // Handle select button press
  const handleSelect = () => {
    buttonScale.value = withSpring(0.95, { damping: 15 }, () => {
      buttonScale.value = withSpring(1, { damping: 15 });
    });
    
    Alert.alert(
      "Add to List",
      `Are you sure you want to add "${data.title}" to your list?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: () => {
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
            {/* Hero Image Section */}
            <View style={styles.heroContainer}>
              <Image source={{ uri: data.image }} style={styles.heroImage} />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)"]}
                style={styles.gradient}
              />
              
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <View style={styles.closeButtonCircle}>
                  <Ionicons name="close" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              
              {/* Favorite Button */}
              <TouchableOpacity 
                style={styles.favoriteButton} 
                onPress={handleToggleFavorite}
                activeOpacity={0.7}
              >
                <Animated.View style={[styles.favoriteButtonCircle, animatedFavoriteStyle]}>
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isFavorite ? "#FF3B5C" : "#fff"} 
                  />
                </Animated.View>
              </TouchableOpacity>

              {/* Hero Content */}
              <View style={styles.heroContent}>
                {/* Template Title */}
                <Text style={styles.templateTitle}>{data.title}</Text>
                
                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  {/* Owner Badge */}
                  <View style={styles.ownerBadge}>
                    <MaterialCommunityIcons
                      name="crown-circle"
                      size={16}
                      color={data.owner !== "BePlan" ? "#D6D6D6" : "#FFD700"}
                    />
                    <Text style={styles.ownerText}>{data.owner}</Text>
                  </View>
                  
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Ionicons
                      name={getCategoryIcon(data.category)}
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.categoryText}>
                      {data.category.charAt(0).toUpperCase() +
                        data.category.slice(1).replace("_", " ")}
                    </Text>
                  </View>
                  
                  {/* Duration Badge */}
                  {data.duration && (
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={16} color="#FFF" />
                      <Text style={styles.durationText}>
                        {formatDuration(data.duration)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            
            {/* Content Tabs */}
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
                  size={20}
                  color={activeTab === "description" ? "#4E5A94" : "#888"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "description" && styles.activeTabText,
                  ]}
                >
                  About
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
                  size={20}
                  color={activeTab === "goals" ? "#4E5A94" : "#888"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "goals" && styles.activeTabText,
                  ]}
                >
                  Goals ({data.goals?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.contentContainer}>
                {/* Description Tab Content */}
                {activeTab === "description" && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.tabContent}
                  >
                    <View style={styles.descriptionContainer}>
                      <Text
                        style={styles.descriptionText}
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
                        {data.goals.map((goal, index) => (
                          <View key={goal.id || index} style={styles.goalItem}>
                            <LinearGradient
                              colors={["#1A237E", "#303F9F"]} 
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.goalGradient}
                            >
                              <View style={styles.goalIconContainer}>
                                <Ionicons
                                  name="flag"
                                  size={16}
                                  color="#FFF"
                                />
                              </View>
                              <Text style={styles.goalText}>{goal.title}</Text>
                            </LinearGradient>
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

            {/* Action Button */}
            <Animated.View style={[styles.actionButtonContainer, animatedButtonStyle]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSelect}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#00695C", "#009688"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    Add to My List
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ====================== Styles ======================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Modal Layout
  modalStyle: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.8,
    backgroundColor: "transparent",
    borderRadius: 24,
    overflow: "hidden",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  
  // Hero Section
  heroContainer: {
    height: SCREEN_HEIGHT * 0.35,
    position: "relative",
    width: "100%",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  templateTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 16,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  
  // Buttons
  closeButton: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  favoriteButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  // Badges
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  ownerText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  durationText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  
  // Tabs
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
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
    fontSize: 15,
    color: "#888",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4E5A94",
    fontWeight: "600",
  },
  
  // Content
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  tabContent: {
    paddingBottom: 16,
  },
  descriptionContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
  },
  showMoreButton: {
    marginTop: 12,
    alignSelf: "center",
    backgroundColor: "#ECECEC",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  showMoreText: {
    color: "#4E5A94",
    fontWeight: "500",
    fontSize: 14,
  },
  
  // Goals List
  goalsList: {
    gap: 12,
  },
  goalItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  goalGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  goalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  goalText: {
    fontSize: 15,
    color: "#FFF",
    flex: 1,
    fontWeight: "500",
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
  
  // Action Button with Green Gradient
  actionButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
  },
  actionButton: {
    borderRadius: 12,
    height: 56,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: '100%',
    height: '100%',
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
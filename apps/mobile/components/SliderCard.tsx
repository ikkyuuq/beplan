import React, { useState } from "react";
import {
  View,
  Text,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import TemplateModal from "./TemplateModal";

// ====================== Type Definitions ======================
type SliderCardProps = {
  index: number;
  title: string;
  image: string;
  description?: string;
  owner: string;
  category: string;
  duration?: number;
  isFavorite: boolean;
  goals_id?: string[];
  scrollX: SharedValue<number>;
  onPress?: () => void;
  onToggleFavorite?: () => void;
};

// ====================== Main Component ======================
export default function SliderCard({
  index,
  title,
  category,
  description,
  owner,
  image,
  duration,
  isFavorite,
  goals_id = [],
  scrollX,
  onPress,
  onToggleFavorite,
}: SliderCardProps) {
  // ====================== Constants ======================
  const screen = Dimensions.get("screen");

  // ====================== State Management ======================
  const [isPressed, setIsPressed] = useState(false);
  const [displayPreviewModal, setDisplayPreviewModal] = useState(false);
  const [isListed, setIsListed] = useState(isFavorite);

  // ====================== Animation Values ======================
  const favoriteScale = useSharedValue(1);

  // ====================== Animation Styles ======================
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          [
            (index - 1) * screen.width,
            index * screen.width,
            (index + 1) * screen.width,
          ],
          [-screen.width * 0.25, 0, screen.width * 0.25],
          "clamp"
        ),
      },
      {
        scale: interpolate(
          scrollX.value,
          [
            (index - 1) * screen.width,
            index * screen.width,
            (index + 1) * screen.width,
          ],
          [0.85, 1, 0.85],
          "clamp"
        ),
      },
    ],
    opacity: interpolate(
      scrollX.value,
      [
        (index - 1) * screen.width,
        index * screen.width,
        (index + 1) * screen.width,
      ],
      [0.5, 1, 0.5],
      "clamp"
    ),
  }));

  const animatedFavoriteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  // ====================== Helper Functions ======================
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

  const getCategoryIcon = (
    category: string
  ): keyof typeof Ionicons.glyphMap => {
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

  // ====================== Event Handlers ======================
  const handleDisplayPreviewModal = () => {
    setDisplayPreviewModal((prev) => !prev);
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      handleDisplayPreviewModal();
    }
  };

  const handleToggleFavorite = () => {
    favoriteScale.value = withSpring(0.8, { damping: 10 }, () => {
      favoriteScale.value = withSpring(1, { damping: 10 });
    });

    setIsListed(!isListed);

    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  // ====================== Render UI ======================
  return (
    <Animated.View>
      <TemplateModal
        isVisible={displayPreviewModal}
        onClose={() => setDisplayPreviewModal(false)}
        onAddToList={() => setIsListed(!isListed)}
        data={{ title, category, image, description, isListed, owner }}
      />

      <Animated.View
        style={[
          animatedStyle,
          {
            justifyContent: "center",
            alignItems: "center",
            width: screen.width,
          },
        ]}
      >
        <Pressable
          onPress={handleCardPress}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.cardContainer}>
            {/* Image Container */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "transparent", "black"]}
                style={styles.gradient}
              />

              {/* Favorite Button */}
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={handleToggleFavorite}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.favoriteIconContainer,
                    isListed && styles.favoriteActive,
                    animatedFavoriteStyle,
                  ]}
                >
                  <Ionicons
                    name={isListed ? "heart" : "heart-outline"}
                    size={18}
                    color={isListed ? "#fff" : "#fff"}
                  />
                </Animated.View>
              </TouchableOpacity>

              {/* Owner Badge */}
              <View style={styles.ownerBadge}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color={owner === "BePlan" ? "#FFD700" : "#FFFFFF"}
                />
                <Text style={styles.ownerText}>{owner}</Text>
              </View>

              {/* Content */}
              <View style={styles.contentContainer}>
                <View style={styles.badgesContainer}>
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Ionicons
                      name={getCategoryIcon(category)}
                      size={12}
                      color="#fff"
                      style={styles.categoryIcon}
                    />
                    <Text style={styles.categoryText}>
                      {category.charAt(0).toUpperCase() +
                        category.slice(1).replace("_", " ")}
                    </Text>
                  </View>

                  {/* Duration Badge */}
                  {duration && (
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={12} color="#fff" />
                      <Text style={styles.durationText}>
                        {formatDuration(duration)}
                      </Text>
                    </View>
                  )}

                  {/* Goals Badge */}
                  {goals_id && goals_id.length > 0 && (
                    <View style={styles.goalsBadge}>
                      <Ionicons name="flag-outline" size={12} color="#fff" />
                      <Text style={styles.goalsText}>
                        {goals_id.length}{" "}
                        {goals_id.length === 1 ? "Goal" : "Goals"}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={styles.title}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Card Styles
  cardContainer: {
    width: 325,
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Image Section
  imageContainer: {
    height: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "100%",
    padding: 16,
  },

  // Favorite Button
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  favoriteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteActive: {
    backgroundColor: "rgba(255, 0, 86, 0.8)",
  },

  // Owner Badge
  ownerBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ownerText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // Content
  contentContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Badges Container
  badgesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Category Badge
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    color: "#e3e3e3",
    fontSize: 12,
  },

  // Duration Badge
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },

  // Goals Badge
  goalsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  goalsText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },
});

import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Template } from "@/types/templateTypes";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// ====================== Type Definitions ======================
type TemplateCardProps = {
  template: Template;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

// ====================== Helper Functions ======================
// Format duration helper
const formatDuration = (days: number): string => {
  if (days >= 365) {
    return "1 Year";
  } else if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "Month" : "Months"}`;
  } else {
    return `${days} ${days === 1 ? "Day" : "Days"}`;
  }
};

// ====================== Main Component ======================
export default function TemplateCard({
  template,
  onSelect,
  onToggleFavorite,
}: TemplateCardProps) {
  // ====================== Animation Values ======================
  const scale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFavoriteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  // ====================== Animation Handlers ======================
  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 10, stiffness: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
  };

  const handleToggleFavorite = () => {
    favoriteScale.value = withSpring(0.8, { damping: 10 }, () => {
      favoriteScale.value = withSpring(1, { damping: 10 });
    });

    if (onToggleFavorite) {
      onToggleFavorite();
    }
  };

  // ====================== Helper Functions ======================
  // Get appropriate icon for category
  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (template.category.toLowerCase()) {
      case "fitness":
        return "barbell-outline";
      case "health":
        return "fitness-outline";
      case "education":
        return "book-outline";
      case "work":
        return "briefcase-outline";
      case "travel":
        return "airplane-outline";
      case "personal_development":
        return "person-outline";
      default:
        return "pricetag-outline";
    }
  };

  // ====================== Render UI ======================
  return (
    <Animated.View
      style={[styles.cardContainer, animatedStyle]}
      entering={FadeIn.duration(400).delay(Math.random() * 300)}
    >
      <Pressable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.card}>
          {/* Image Container */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: template.image }} style={styles.image} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.gradient}
            />

            {/* Category Badge */}
            <View style={styles.categoryBadge}>
              <Ionicons
                name={getCategoryIcon()}
                size={12}
                color="#fff"
                style={styles.categoryIcon}
              />
              <Text style={styles.categoryText}>
                {template.category.charAt(0).toUpperCase() +
                  template.category.slice(1).replace("_", " ")}
              </Text>
            </View>

            {/* Duration Badge */}
            {template.duration && (
              <View style={styles.durationBadge}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color="#fff"
                  style={styles.durationIcon}
                />
                <Text style={styles.durationText}>
                  {formatDuration(template.duration)}
                </Text>
              </View>
            )}

            {/* Favorite Button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleToggleFavorite}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.favoriteIconContainer,
                  template.isFavorite && styles.favoriteActive,
                  animatedFavoriteStyle,
                ]}
              >
                <Ionicons
                  name={template.isFavorite ? "heart" : "heart-outline"}
                  size={18}
                  color={template.isFavorite ? "#fff" : "#fff"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Content Section */}
          <View style={styles.contentContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {template.title}
            </Text>

            <Text
              style={styles.description}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {template.description}
            </Text>

            {/* Goals Badge */}
            <View style={styles.goalsContainer}>
              <Ionicons name="flag-outline" size={14} color="#8B98D5" />
              <Text style={styles.goalsText}>
                {template.goals_id.length}{" "}
                {template.goals_id.length === 1 ? "Goal" : "Goals"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Card Container
  cardContainer: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#fff",
  },

  // Image Section
  imageContainer: {
    height: 140,
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
    height: "50%",
  },

  // Category Badge
  categoryBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },

  // Duration Badge
  durationBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
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

  // Content Section
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },

  // Goals Section
  goalsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalsText: {
    fontSize: 12,
    color: "#8B98D5",
    marginLeft: 4,
  },
});

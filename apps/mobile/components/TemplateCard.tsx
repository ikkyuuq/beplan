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
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// ====================== Type Definitions ======================
type Task = {
  title: string;
  description?: string;
  repeat_type: string;
  week_interval?: number[];
};

type Goal = {
  id: string;
  title: string;
  tasks: Task[];
};

type Template = {
  id: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  created_by: {
    user_id: string;
    username: string | null;
    image: string | null;
    occupation: string | null;
    about: string | null;
  };
  type: string;
  goals: Goal[];
  status: string;
  duration: number;
  isFavorite: boolean;
  isListed?: boolean;
};

type TemplateCardProps = {
  template: Template;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

// ====================== Helper Functions ======================
const formatDuration = (days: number): string => {
  if (days >= 365) return "1 Year";
  if (days >= 30) {
    const months = Math.floor(days / 30);
    if (months === 1) {
      return "1 Month";
    } else {
      return `${months} Months`;
    }
  }
  return `${days} Days`;
};

export default function TemplateCard({
  template,
  onSelect,
  onToggleFavorite,
}: TemplateCardProps) {
  const scale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFavoriteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleToggleFavorite = () => {
    favoriteScale.value = withSpring(0.8, {}, () => {
      favoriteScale.value = withSpring(1);
    });
    onToggleFavorite();
  };

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
          {/* Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: template.image_url }} style={styles.image} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.gradient}
            />

            {/* Badges */}
            <View style={styles.badgesContainer}>
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

              {/* Goals Badge */}
              {template.goals.length > 0 && (
                <View style={styles.goalsBadge}>
                  <Ionicons name="flag-outline" size={12} color="#fff" />
                  <Text style={styles.goalsText}>
                    {template.goals.length}{" "}
                    {template.goals.length === 1 ? "Goal" : "Goals"}
                  </Text>
                </View>
              )}
            </View>

            {/* Duration */}
            {template.duration && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={12} color="#fff" />
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
                  color="#fff"
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Title */}
            <View style={styles.contentContainer}>
              <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                {template.title}
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
    height: 180,
  },
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#fff",
    height: "100%",
  },

  // Image Section
  imageContainer: {
    height: "100%",
    position: "relative",
    width: "100%",
  },
  image: {
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

  // Badges Container
  badgesContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Category Badge
  categoryBadge: {
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

  // Content Section - Now positioned at the bottom of the card
  contentContainer: {
    position: "absolute",
    bottom: 50,
    left: 10,
    right: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

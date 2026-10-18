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
  withSequence,
  withTiming,
  useAnimatedStyle,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "@/i18n";
import { categoryLabel, formatDuration } from "@/i18n/format";
import { MOTION } from "@/constants/motion";

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

export default function TemplateCard({
  template,
  onSelect,
  onToggleFavorite,
}: TemplateCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedFavoriteStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, MOTION.fast);
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, MOTION.fast);
  };

  const handleToggleFavorite = () => {
    // The heart flips at once (the parent updates before the request); this
    // is just a short pop on top.
    favoriteScale.value = withSequence(
      withTiming(1.25, { ...MOTION.fast, duration: 90 }),
      withTiming(1, MOTION.fast)
    );
    onToggleFavorite();
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    // Same icons as the community filter chips (the backend's five categories).
    switch (template.category.toLowerCase()) {
      case "workout":
        return "barbell-outline";
      case "health":
        return "fitness-outline";
      case "education":
        return "book-outline";
      case "productivity":
        return "checkbox-outline";
      case "finance":
        return "cash-outline";
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
        style={styles.pressable}
      >
        <View style={styles.card}>
          {/* Image */}
          <View style={styles.imageContainer}>
            {!!template.image_url ? (
              <Image source={{ uri: template.image_url }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={40} color="#8B98D5" />
              </View>
            )}
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
                <Text
                  style={styles.categoryText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={BADGE_MAX_FONT_SCALE}
                >
                  {categoryLabel(template.category)}
                </Text>
              </View>

              {/* Goals Badge */}
              {template.goals.length > 0 && (
                <View style={styles.goalsBadge}>
                  <Ionicons name="flag-outline" size={12} color="#fff" />
                  <Text
                    style={styles.goalsText}
                    numberOfLines={1}
                    maxFontSizeMultiplier={BADGE_MAX_FONT_SCALE}
                  >
                    {t("template.goals", { count: template.goals.length })}
                  </Text>
                </View>
              )}
            </View>

            {/* Duration */}
            {!!template.duration && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={12} color="#fff" />
                <Text
                  style={styles.durationText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={BADGE_MAX_FONT_SCALE}
                >
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
              <Text
                style={styles.title}
                numberOfLines={2}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={TITLE_MAX_FONT_SCALE}
              >
                {template.title}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Cards are ~half the screen wide; let the phone's font-size setting grow the
// text a little, but not past the card.
const BADGE_MAX_FONT_SCALE = 1.2;
const TITLE_MAX_FONT_SCALE = 1.3;

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
  // The card's "100%" heights resolve against this, so it must fill the container.
  pressable: {
    height: "100%",
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
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8ECF8",
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
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Category Badge
  categoryBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    flexShrink: 1,
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
    flexShrink: 1,
  },
  goalsText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    flexShrink: 1,
  },

  // Duration Badge
  durationBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    maxWidth: "70%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationIcon: {
    marginRight: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
    flexShrink: 1,
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

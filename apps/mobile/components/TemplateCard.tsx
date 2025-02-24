import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Template } from "@/types/templateTypes";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";

// ====================== Types ======================
type TemplateCardProps = {
  template: Template;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

// ====================== Component ======================
export default function TemplateCard({
  template,
  onSelect,
  onToggleFavorite,
}: TemplateCardProps) {
  // ====================== Animation ======================
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  // ====================== Render UI ======================
  return (
    <Pressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={150}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <Image source={{ uri: template.image }} style={styles.image} />
        <View style={styles.cardContent}>
          <Text style={styles.title}>{template.title}</Text>
          <Text style={styles.category}>{template.category}</Text>

          {/* Favorite Button */}
          <Pressable onPress={onToggleFavorite} style={styles.favoriteButton}>
            <Ionicons
              name={template.isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={template.isFavorite ? "red" : "#777"}
            />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Card Styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 150,
  },

  // Content Styles
  cardContent: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  category: {
    fontSize: 12,
    color: "#777",
    marginTop: 5,
  },

  // Button Styles
  favoriteButton: {
    position: "absolute",
    right: 10,
    top: 10,
  },
});

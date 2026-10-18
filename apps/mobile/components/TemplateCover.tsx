import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { categoryStyle } from "@/constants/categories";

type TemplateCoverProps = {
  imageUrl?: string | null;
  category?: string | null;
  style?: StyleProp<ViewStyle & ImageStyle>;
  /** Size of the category icon on the default cover. */
  iconSize?: number;
  /** E.g. a bottom margin to keep the icon clear of a title. */
  iconStyle?: StyleProp<ViewStyle>;
};

/**
 * A template's cover photo, or, when it has none, a gradient in the
 * category's colors with the category icon.
 */
export default function TemplateCover({
  imageUrl,
  category,
  style,
  iconSize = 48,
  iconStyle,
}: TemplateCoverProps) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={style} resizeMode="cover" />;
  }

  const { icon, gradient } = categoryStyle(category);
  return (
    <View style={[style, styles.fallback]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={iconStyle}>
        <Ionicons name={icon} size={iconSize} color="rgba(255,255,255,0.85)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getOccupationIconData } from "../hooks/OccupationProfileIcons";

// ====================== Type Definitions ======================
type OccupationProfileIconProps = {
  occupation: string | null | undefined;
  size?: number;
  showLabel?: boolean;
};

// ====================== Main Component ======================
export default function OccupationProfileIcon({
  occupation,
  size = 100,
  showLabel = false,
}: OccupationProfileIconProps) {
  // ====================== Helper Variables ======================
  const iconData = getOccupationIconData(occupation);
  const iconSize = size * 0.5; // 50% of the size

  // ====================== Render UI ======================
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: iconData.color,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Ionicons name={iconData.icon as any} size={iconSize} color="#FFFFFF" />
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Container Styles
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

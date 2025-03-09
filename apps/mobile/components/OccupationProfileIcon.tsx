import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getOccupationIconData } from "../hooks/OccupationProfileIcons";

type OccupationProfileIconProps = {
  occupation: string | null | undefined;
  size?: number;
  showLabel?: boolean;
};

{
  /* Component that displays an icon based on the user's occupation */
}
export default function OccupationProfileIcon({
  occupation,
  size = 100,
}: OccupationProfileIconProps) {
  const iconData = getOccupationIconData(occupation);
  const iconSize = size * 0.5; // 50% of the size

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

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

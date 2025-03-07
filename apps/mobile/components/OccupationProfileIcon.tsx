import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getOccupationIconData } from "../hooks/OccupationProfileIcons";

type OccupationProfileIconProps = {
  occupation: string | null | undefined;
  size?: number;
  showLabel?: boolean;
};

/**
 * Component that displays an icon based on the user's occupation
 */
const OccupationProfileIcon: React.FC<OccupationProfileIconProps> = ({
  occupation,
  size = 100,
}) => {
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
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default OccupationProfileIcon;

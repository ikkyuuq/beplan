import { View, Text } from "react-native";
import React from "react";
import {
  FontAwesome6,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";

export default function CollapseItem({ title }: { title: string }) {
  const icon = {
    finance: [
      <MaterialCommunityIcons name="finance" size={24} color="white" />,
      <MaterialCommunityIcons name="bank" size={24} color="white" />,
      <MaterialIcons name="attach-money" size={24} color="white" />,
      <FontAwesome6 name="money-bill-transfer" size={24} color="white" />,
    ],
  };
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 16,
        backgroundColor: "#16171F",
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon.finance[Math.floor(Math.random() * icon.finance.length)]}
      <Text style={{ color: "#fff", fontSize: 14 }}>{title}</Text>
    </View>
  );
}

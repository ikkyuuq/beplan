import { View, Text, Pressable, LayoutChangeEvent } from "react-native";
import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

export default function CollapseItem({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const layoutHeight = event.nativeEvent.layout.height;
    setContentHeight(layoutHeight);
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: withSpring(collapsed ? contentHeight : 0, {
      damping: 20,
      stiffness: 100,
    }),
    opacity: withSpring(collapsed ? 1 : 0),
    overflow: "hidden",
  }));

  return (
    <Pressable
      onPress={() => description && setCollapsed(!collapsed)}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#1E1F29",
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 14 }}>{title}</Text>
        <Animated.View style={[animatedContainerStyle]}>
          <View onLayout={onLayout} style={{ position: "absolute" }}>
            <Text style={{ color: "#B0B0B0", fontSize: 12, paddingTop: 6 }}>
              {description}
            </Text>
          </View>
        </Animated.View>
      </View>
      <View>
        {description && (
          <Feather
            name="info"
            size={16}
            color={collapsed ? "#fff" : "#8d8d8d"}
          />
        )}
      </View>
    </Pressable>
  );
}

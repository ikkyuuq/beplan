import {
  View,
  Text,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
} from "react-native";
import React, { useState } from "react";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

type CollapsableProps = {
  title: string;
  type?: string;
  category?: string;
  children: React.ReactNode;
};

export default function Collapsable({
  title,
  type,
  category,
  children,
}: CollapsableProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapseHeight, setCollapseHeight] = useState(0);

  const onCollapseLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;

    if (height > 0 && height !== collapseHeight) {
      setCollapseHeight(height);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const animateArrow = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withSpring(collapsed ? "180deg" : "0deg", {
            duration: 2500,
          }),
        },
      ],
    };
  });

  const animateCollapse = useAnimatedStyle(() => {
    const animateHeight = collapsed
      ? withSpring(collapseHeight, {
          damping: 20,
          stiffness: 100,
        })
      : withSpring(0);
    const animateMargin = collapsed
      ? withSpring(10, {
          damping: 20,
          stiffness: 100,
        })
      : withSpring(0);
    return {
      opacity: withTiming(collapsed ? 1 : 0),
      height: animateHeight,
      marginVertical: animateMargin,
    };
  });
  return (
    <View
      style={{
        marginHorizontal: 40,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowRadius: 20,
        shadowOpacity: 0.1,
        elevation: 1,
        backgroundColor: "#fff",
        borderRadius: 10,
      }}
    >
      <TouchableWithoutFeedback onPress={toggleCollapse}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
            <Text style={{ color: "#8d8d8d", fontWeight: "300", fontSize: 10 }}>
              {type} {category && ` - ${category}`}
            </Text>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                color: "#000",
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              {title}
            </Text>
          </View>
          <Animated.View style={[animateArrow]}>
            <Feather name="chevron-down" size={24} color="black" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
      <Animated.View style={[animateCollapse, { overflow: "hidden" }]}>
        <View
          onLayout={onCollapseLayout}
          style={{
            paddingBottom: 10,
            position: "absolute",
            paddingHorizontal: 16,
            width: "100%",
            gap: 12,
          }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

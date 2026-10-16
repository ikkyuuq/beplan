import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import TabBarButton from "./TabBarButton";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MOTION } from "@/constants/motion";
import { TAB_BAR_HEIGHT, useTabBarBottomOffset } from "@/constants/layout";

const BAR_PADDING_X = 8;
const BAR_PADDING_Y = 8;
const HIGHLIGHT_INSET = 4;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Float above the home indicator instead of filling it: on rounded-corner
  // iPhones a bar glued to the bottom edge looked clipped.
  const bottomOffset = useTabBarBottomOffset();
  // Buttons share the bar's width minus its horizontal padding, so the
  // highlight must use the same width or it drifts right tab by tab.
  const buttonWidth =
    (dimensions.width - BAR_PADDING_X * 2) / state.routes.length;
  const tabPosX = useSharedValue(0);

  const onTabBarLayout = (e: LayoutChangeEvent) => {
    setDimensions({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const animateTabBar = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: tabPosX.value }],
    };
  });

  useEffect(() => {
    if (buttonWidth > 0) {
      tabPosX.value = withTiming(buttonWidth * state.index, MOTION.base);
    }
  }, [buttonWidth, state.index, tabPosX]);

  return (
    <View
      onLayout={onTabBarLayout}
      style={[styles.tabbar, { bottom: bottomOffset }]}
    >
      <Animated.View
        style={[
          animateTabBar,
          {
            borderRadius: 18,
            position: "absolute",
            // Centered in the active button with an even inset on every side.
            top: BAR_PADDING_Y,
            left: BAR_PADDING_X + HIGHLIGHT_INSET,
            backgroundColor: "#4E5A94",
            width: Math.max(buttonWidth - HIGHLIGHT_INSET * 2, 0),
            height: Math.max(dimensions.height - BAR_PADDING_Y * 2, 0),
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        const isFocused = state.index === index;

        const onPress = () => {
          tabPosX.value = withTiming(buttonWidth * index, MOTION.base);
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TabBarButton
            key={route.name}
            onPress={onPress}
            onLongPress={onLongPress}
            options={options}
            isFocused={isFocused}
            route={route}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    position: "absolute",
    left: 16,
    right: 16,
    minHeight: TAB_BAR_HEIGHT,
    flexDirection: "row",
    backgroundColor: "#fff",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: BAR_PADDING_X,
    paddingVertical: BAR_PADDING_Y,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default CustomTabBar;

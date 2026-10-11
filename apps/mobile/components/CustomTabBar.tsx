import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import TabBarButton from "./TabBarButton";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  const buttonWidth = dimensions.width / state.routes.length;
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
      tabPosX.value = withSpring(buttonWidth * state.index, {
        mass: 0.8,
        damping: 18,
        stiffness: 180,
      });
    }
  }, [buttonWidth, state.index, tabPosX]);

  return (
    <View
      onLayout={onTabBarLayout}
      style={[styles.tabbar, { paddingBottom: bottomPadding }]}
    >
      <Animated.View
        style={[
          animateTabBar,
          {
            borderRadius: 18,
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "#4E5A94",
            width: Math.max(buttonWidth - 16, 0),
            height: Math.max(dimensions.height - bottomPadding - 16, 0),
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        const isFocused = state.index === index;

        const onPress = () => {
          tabPosX.value = withSpring(buttonWidth * index, {
            mass: 0.8,
            damping: 18,
            stiffness: 180,
          });
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
    bottom: 0,
    minHeight: 72,
    flexDirection: "row",
    backgroundColor: "#fff",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default CustomTabBar;

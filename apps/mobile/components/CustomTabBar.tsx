import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import TabBarButton from "./TabBarButton";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
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

  return (
    <View onLayout={onTabBarLayout} style={styles.tabbar}>
      <Animated.View
        style={[
          animateTabBar,
          {
            borderRadius: 20,
            position: "absolute",
            backgroundColor: "#000",
            width: buttonWidth,
            height: dimensions.height,
          },
        ]}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        const isFocused = state.index === index;

        const onPress = () => {
          tabPosX.value = withSpring(buttonWidth * index, {
            mass: 1,
            damping: 20,
            stiffness: 200,
            overshootClamping: false,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 2,
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
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 90,
    justifyContent: "space-between",
    alignItems: "center",
    bottom: 50,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowRadius: 10,
    elevation: 45,
  },
});

export default CustomTabBar;

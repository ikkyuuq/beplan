import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";

type TabBarButtonProps = {
  options: any;
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

export default function TabBarButton({
  options,
  route,
  isFocused,
  onPress,
  onLongPress,
}: TabBarButtonProps) {
  const icons = {
    schedule: (props: any) => <AnimatedFeather name="calendar" {...props} />,
    analysis: (props: any) => <AnimatedFeather name="bar-chart-2" {...props} />,
    create: (props: any) => <AnimatedFeather name="plus-circle" {...props} />,
    community: (props: any) => <AnimatedFeather name="users" {...props} />,
  };

  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0);
  }, [scale, isFocused]);

  const Icon = icons[route.name as keyof typeof icons] ?? icons.schedule;

  return (
    <Pressable
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabBarButton}
    >
      <Icon
        size={24}
        color={isFocused ? "#fff" : "#222"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBarButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    aspectRatio: 1,
  },
});

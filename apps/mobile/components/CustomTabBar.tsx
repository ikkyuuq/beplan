import { View, Platform } from "react-native";
import { useLinkBuilder, useTheme } from "@react-navigation/native";
import { Text, PlatformPressable } from "@react-navigation/elements";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Entypo, Feather } from "@expo/vector-icons";

type TabButtonProps = {
  route: any;
  isFocused: boolean;
  navigation: any;
  descriptors: any;
  buildHref: (routeName: string, params?: object) => string;
  icon: any;
};

const TabButton = ({
  route,
  isFocused,
  navigation,
  descriptors,
  buildHref,
  icon,
}: TabButtonProps) => {
  const { options } = descriptors[route.key];

  const onPress = () => {
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
    <PlatformPressable
      key={route.name}
      href={buildHref(route.name, route.params)}
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        backgroundColor: isFocused ? "#000" : "#fff",
        borderRadius: 15,
        aspectRatio: 1,
      }}
    >
      {icon[route.name](isFocused ? { color: "#fff" } : { color: "#000" })}
    </PlatformPressable>
  );
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { buildHref } = useLinkBuilder();

  const icon = {
    schedule: (props: any) => <Feather name="calendar" size={24} {...props} />,
    analysis: (props: any) => <Entypo name="line-graph" size={24} {...props} />,
    create: (props: any) => <Feather name="plus-circle" size={24} {...props} />,
    community: (props: any) => <Feather name="users" size={24} {...props} />,
  };

  const { mainRoutes, communityRoute } = state.routes.reduce(
    (acc, route) => {
      if (route.name === "community") {
        acc.communityRoute = route;
      } else {
        acc.mainRoutes.push(route);
      }
      return acc;
    },
    { mainRoutes: [], communityRoute: null },
  );

  return (
    <View
      style={{
        flexDirection: "row",
        position: "absolute",
        bottom: 40,
        marginHorizontal: 100,
        gap: 5,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          borderRadius: 15,
          backgroundColor: "#fff",
          flex: 1,
          gap: 3,
        }}
      >
        {mainRoutes.map((route, index) => (
          <TabButton
            key={route.name}
            route={route}
            isFocused={state.index === index}
            navigation={navigation}
            descriptors={descriptors}
            buildHref={buildHref}
            icon={icon}
          />
        ))}
      </View>

      {communityRoute && (
        <View
          style={{
            flexDirection: "row",
            flex: 1 / 3,
          }}
        >
          <TabButton
            route={communityRoute}
            isFocused={state.index === state.routes.length - 1}
            navigation={navigation}
            descriptors={descriptors}
            buildHref={buildHref}
            icon={icon}
          />
        </View>
      )}
    </View>
  );
}

export default CustomTabBar;

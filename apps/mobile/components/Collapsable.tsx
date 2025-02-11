import {
  View,
  Text,
  TouchableWithoutFeedback,
  ActionSheetIOS,
  Alert,
} from "react-native";
import React, { useState } from "react";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing"; 
import { routes } from "@/routesConfig";


export default function Collapsable({
  children,
  goalTitle,
  onRemove,
}: {
  children: React.ReactNode;
  goalTitle: string;
  onRemove: () => void; 
}) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const openActionSheet = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: goalTitle,
        options: ["Remove", "Customize", "Share", "Cancel"],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 3,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          Alert.alert("Confirm", "Do you want to remove this goal?", [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: onRemove },
          ]);
        } else if (buttonIndex === 1) {
          router.push({
            pathname: routes.customizeGoal,
            params: { 
              title: goalTitle,
              tasks: JSON.stringify(
                React.Children.toArray(children)?.map((task: any) => ({
                  text: task.props.title,
                  type: task.props.type || "daily",
                })) || []
              ),
            },
          });
          
        } else if (buttonIndex === 2) {
          shareGoal();
        }
      }
    );
  };

  const shareGoal = async () => {
    try {
      await Sharing.shareAsync("https://beplan.app/share/" + encodeURIComponent(goalTitle), {
        dialogTitle: "Share your goal",
        mimeType: "text/plain",
        UTI: "public.plain-text",
      });
    } catch (error) {
      Alert.alert("Error", "Cannot share goal.");
    }
  };

  return (
    <View
      style={{
        marginHorizontal: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        shadowOpacity: 0.1,
        elevation: 1,
        backgroundColor: "#fff",
        borderRadius: 10,
      }}
    >
      <TouchableWithoutFeedback onPress={toggleCollapse} onLongPress={openActionSheet}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: "#8d8d8d", fontWeight: "thin", fontSize: 10 }}>
              SMART Goal:
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: "#000", fontWeight: "bold", fontSize: 14, flexShrink: 1 }}>
              {goalTitle}
            </Text>
          </View>
          <Animated.View>
            <Feather name="chevron-down" size={24} color="black" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
      <Animated.View style={{ height: collapsed ? "auto" : 0, overflow: "hidden" }}>
        <View style={{ paddingBottom: 10, paddingHorizontal: 16, gap: 12 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
